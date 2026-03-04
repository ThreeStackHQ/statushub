import { db } from '@statushub/db';
import { components, uptimeChecks, statusPages } from '@statushub/db/schema';
import { eq } from 'drizzle-orm';
import type { Component, StatusPage } from '@statushub/db';
import { sendStatusChangeAlert } from './alerts';

type CheckStatus = 'operational' | 'degraded' | 'down';

export interface CheckResult {
  status: CheckStatus;
  responseTimeMs: number | null;
  statusCode: number | null;
  error: string | null;
}

/**
 * Check a single component's URL and return result.
 * <200ms = operational, <1000ms = degraded, error/timeout = down
 */
export async function checkComponent(component: Component): Promise<CheckResult> {
  if (!component.url) {
    return { status: 'down', responseTimeMs: null, statusCode: null, error: 'No URL configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const start = Date.now();

  try {
    const response = await fetch(component.url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'StatusHub-Monitor/1.0' },
    });

    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;
    const statusCode = response.status;

    // HTTP errors (5xx) = down, otherwise check response time
    if (statusCode >= 500) {
      return { status: 'down', responseTimeMs, statusCode, error: `HTTP ${statusCode}` };
    }

    let status: CheckStatus;
    if (responseTimeMs < 200) {
      status = 'operational';
    } else if (responseTimeMs < 1000) {
      status = 'degraded';
    } else {
      status = 'degraded';
    }

    return { status, responseTimeMs, statusCode, error: null };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      status: 'down',
      responseTimeMs,
      statusCode: null,
      error: isTimeout ? 'Request timed out after 10s' : (err instanceof Error ? err.message : 'Unknown error'),
    };
  }
}

/**
 * Run a full monitoring cycle: check all components, record results,
 * update statuses, and fire alerts for state changes.
 */
export async function runMonitoringCycle(): Promise<{ checked: number; changed: number }> {
  // Fetch all components with their status pages
  const allComponents = await db
    .select({
      component: components,
      statusPage: statusPages,
    })
    .from(components)
    .innerJoin(statusPages, eq(components.statusPageId, statusPages.id));

  let checked = 0;
  let changed = 0;

  await Promise.all(
    allComponents.map(async ({ component, statusPage }) => {
      try {
        const result = await checkComponent(component);
        checked++;

        // Insert uptime check record
        await db.insert(uptimeChecks).values({
          componentId: component.id,
          status: result.status,
          responseTimeMs: result.responseTimeMs ?? null,
          statusCode: result.statusCode ?? null,
          error: result.error ?? null,
          checkedAt: new Date(),
        });

        // Update component status if changed
        if (component.status !== result.status) {
          changed++;
          await db
            .update(components)
            .set({ status: result.status, updatedAt: new Date() })
            .where(eq(components.id, component.id));

          // Trigger alert
          try {
            await sendStatusChangeAlert(
              { ...component, status: result.status },
              component.status,
              result.status,
              statusPage as StatusPage,
            );
          } catch (alertErr) {
            console.error(`Alert failed for component ${component.id}:`, alertErr);
          }
        }
      } catch (err) {
        console.error(`Failed to check component ${component.id}:`, err);
      }
    })
  );

  return { checked, changed };
}
