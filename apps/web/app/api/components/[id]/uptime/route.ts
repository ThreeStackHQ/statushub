import { NextRequest, NextResponse } from 'next/server';
import { db } from '@statushub/db';
import { components, uptimeChecks, statusPages } from '@statushub/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

type Range = '24h' | '7d' | '30d' | '90d';

function getStartDate(range: Range): Date {
  const now = new Date();
  switch (range) {
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
}

function getBucket(range: Range): 'hour' | 'day' {
  return range === '24h' || range === '7d' ? 'hour' : 'day';
}

function percentile95(sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil(sortedValues.length * 0.95) - 1;
  return sortedValues[Math.max(0, idx)];
}

// GET /api/components/:id/uptime?range=24h|7d|30d|90d
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = request.nextUrl;
    const rangeParam = (searchParams.get('range') ?? '24h') as Range;

    const validRanges: Range[] = ['24h', '7d', '30d', '90d'];
    if (!validRanges.includes(rangeParam)) {
      return NextResponse.json(
        { error: 'Invalid range. Use 24h, 7d, 30d, or 90d.' },
        { status: 400 }
      );
    }

    // Verify component exists and belongs to a status page (public endpoint)
    const [component] = await db
      .select({ component: components, statusPage: statusPages })
      .from(components)
      .innerJoin(statusPages, eq(components.statusPageId, statusPages.id))
      .where(eq(components.id, params.id))
      .limit(1);

    if (!component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    const startDate = getStartDate(rangeParam);
    const bucket = getBucket(rangeParam);

    // Fetch all checks in range
    const checks = await db
      .select({
        status: uptimeChecks.status,
        responseTimeMs: uptimeChecks.responseTimeMs,
        checkedAt: uptimeChecks.checkedAt,
      })
      .from(uptimeChecks)
      .where(
        and(
          eq(uptimeChecks.componentId, params.id),
          gte(uptimeChecks.checkedAt, startDate)
        )
      )
      .orderBy(uptimeChecks.checkedAt);

    if (checks.length === 0) {
      return NextResponse.json({
        uptimePercent: 100,
        avgResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        totalChecks: 0,
        downChecks: 0,
        ranges: [],
      });
    }

    // Overall stats
    const totalChecks = checks.length;
    const downChecks = checks.filter(c => c.status === 'down').length;
    const uptimePercent = parseFloat(
      (((totalChecks - downChecks) / totalChecks) * 100).toFixed(2)
    );

    const responseTimes = checks
      .map(c => c.responseTimeMs)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);

    const avgResponseTimeMs =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    const p95ResponseTimeMs = percentile95(responseTimes);

    // Aggregate by bucket (hour or day)
    const bucketMap = new Map<string, { total: number; down: number; responseTimes: number[] }>();

    for (const check of checks) {
      const d = new Date(check.checkedAt);
      let key: string;

      if (bucket === 'hour') {
        key = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours())
        ).toISOString();
      } else {
        key = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        ).toISOString();
      }

      const existing = bucketMap.get(key) ?? { total: 0, down: 0, responseTimes: [] };
      existing.total++;
      if (check.status === 'down') existing.down++;
      if (check.responseTimeMs !== null) existing.responseTimes.push(check.responseTimeMs);
      bucketMap.set(key, existing);
    }

    const ranges = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, data]) => ({
        timestamp,
        uptimePercent: parseFloat(
          (((data.total - data.down) / data.total) * 100).toFixed(2)
        ),
        avgResponseTimeMs:
          data.responseTimes.length > 0
            ? Math.round(
                data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
              )
            : 0,
      }));

    return NextResponse.json({
      uptimePercent,
      avgResponseTimeMs,
      p95ResponseTimeMs,
      totalChecks,
      downChecks,
      ranges,
    });
  } catch (error) {
    console.error('Uptime history error:', error);
    return NextResponse.json({ error: 'Failed to fetch uptime history' }, { status: 500 });
  }
}
