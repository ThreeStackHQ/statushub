import { Resend } from 'resend';
import { createHmac } from 'crypto';
import { db } from '@statushub/db';
import { subscribers } from '@statushub/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { Component, Incident, StatusPage } from '@statushub/db';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? 'StatusHub <noreply@statushub.io>';

// ─── Unsubscribe token ────────────────────────────────────────────────────────

export function generateUnsubscribeToken(subscriberId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? 'unsubscribe-secret';
  return createHmac('sha256', secret).update(subscriberId).digest('hex');
}

export function verifyUnsubscribeToken(subscriberId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(subscriberId);
  const expectedBuf = Buffer.from(expected, 'hex');
  const tokenBuf = Buffer.from(token, 'hex');
  if (expectedBuf.length !== tokenBuf.length) return false;
  try {
    const { timingSafeEqual } = require('crypto') as typeof import('crypto');
    return timingSafeEqual(expectedBuf, tokenBuf);
  } catch {
    return expected === token;
  }
}

// ─── Email helpers ────────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status) {
    case 'operational': return '#22c55e';
    case 'degraded': return '#f59e0b';
    case 'down': return '#ef4444';
    default: return '#6b7280';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'operational': return '✅ Operational';
    case 'degraded': return '⚠️ Degraded';
    case 'down': return '🔴 Down';
    default: return status;
  }
}

function baseTemplate(
  primaryColor: string,
  title: string,
  body: string,
  unsubscribeUrl: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:${primaryColor};padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">StatusHub</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">${title}</h2>
            ${body}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              You're receiving this because you subscribed to status updates.
              <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Status Change Alert ──────────────────────────────────────────────────────

export async function sendStatusChangeAlert(
  component: Component,
  oldStatus: string,
  newStatus: string,
  statusPage: StatusPage,
): Promise<void> {
  const resend = getResend();
  const primaryColor = statusPage.primaryColor ?? '#3b82f6';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://statushub.io';

  const activeSubscribers = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.statusPageId, statusPage.id),
        eq(subscribers.verified, true),
        isNull(subscribers.unsubscribedAt),
      )
    );

  if (activeSubscribers.length === 0) return;

  for (const subscriber of activeSubscribers) {
    const token = generateUnsubscribeToken(subscriber.id);
    const unsubscribeUrl = `${baseUrl}/unsubscribe/${token}?id=${subscriber.id}`;

    const body = `
      <p style="color:#374151;margin:0 0 16px;">
        The status of <strong>${component.name}</strong> on 
        <strong>${statusPage.name}</strong> has changed.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="padding:8px 16px;background:#f9fafb;border-radius:4px 0 0 4px;color:#6b7280;font-size:14px;">Previous</td>
          <td style="padding:8px 16px;background:#f9fafb;border-radius:0 4px 4px 0;color:${getStatusColor(oldStatus)};font-weight:600;font-size:14px;">${getStatusLabel(oldStatus)}</td>
        </tr>
        <tr><td colspan="2" style="height:4px;"></td></tr>
        <tr>
          <td style="padding:8px 16px;background:#f9fafb;border-radius:4px 0 0 4px;color:#6b7280;font-size:14px;">Current</td>
          <td style="padding:8px 16px;background:#f9fafb;border-radius:0 4px 4px 0;color:${getStatusColor(newStatus)};font-weight:600;font-size:14px;">${getStatusLabel(newStatus)}</td>
        </tr>
      </table>
      <p style="color:#374151;margin:0;">
        <a href="https://${statusPage.subdomain}.statushub.io" style="color:${primaryColor};text-decoration:none;font-weight:600;">
          View status page →
        </a>
      </p>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: subscriber.email,
      subject: `[${statusPage.name}] ${component.name} is now ${newStatus}`,
      html: baseTemplate(primaryColor, `Status update: ${component.name}`, body, unsubscribeUrl),
    });
  }
}

// ─── Incident Alert ───────────────────────────────────────────────────────────

export async function sendIncidentAlert(
  incident: Incident,
  statusPage: StatusPage,
  updateType: 'created' | 'updated' | 'resolved',
): Promise<void> {
  const resend = getResend();
  const primaryColor = statusPage.primaryColor ?? '#3b82f6';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://statushub.io';

  const activeSubscribers = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.statusPageId, statusPage.id),
        eq(subscribers.verified, true),
        isNull(subscribers.unsubscribedAt),
      )
    );

  if (activeSubscribers.length === 0) return;

  const subjectMap = {
    created: `[${statusPage.name}] New incident: ${incident.title}`,
    updated: `[${statusPage.name}] Update: ${incident.title}`,
    resolved: `[${statusPage.name}] Resolved: ${incident.title}`,
  };

  const labelMap = {
    created: '🔴 Incident Reported',
    updated: '⚠️ Incident Updated',
    resolved: '✅ Incident Resolved',
  };

  for (const subscriber of activeSubscribers) {
    const token = generateUnsubscribeToken(subscriber.id);
    const unsubscribeUrl = `${baseUrl}/unsubscribe/${token}?id=${subscriber.id}`;

    const body = `
      <p style="color:#374151;margin:0 0 16px;">
        <strong>${labelMap[updateType]}</strong> on 
        <a href="https://${statusPage.subdomain}.statushub.io" style="color:${primaryColor};">${statusPage.name}</a>
      </p>
      <div style="background:#f9fafb;border-left:4px solid ${primaryColor};padding:16px;border-radius:0 4px 4px 0;margin:0 0 16px;">
        <p style="margin:0 0 8px;font-weight:600;color:#111827;">${incident.title}</p>
        <p style="margin:0;color:#374151;font-size:14px;">${incident.body}</p>
      </div>
      <p style="color:#6b7280;font-size:12px;margin:0;">
        Severity: <strong>${incident.severity}</strong> &bull; Status: <strong>${incident.status}</strong>
        ${incident.resolvedAt ? ` &bull; Resolved at: ${incident.resolvedAt.toISOString()}` : ''}
      </p>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: subscriber.email,
      subject: subjectMap[updateType],
      html: baseTemplate(primaryColor, incident.title, body, unsubscribeUrl),
    });
  }
}

// ─── Confirmation Email ───────────────────────────────────────────────────────

export async function sendConfirmationEmail(
  email: string,
  subscriberId: string,
  statusPage: StatusPage,
): Promise<void> {
  const resend = getResend();
  const primaryColor = statusPage.primaryColor ?? '#3b82f6';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://statushub.io';
  const token = generateUnsubscribeToken(subscriberId);
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${token}?id=${subscriberId}`;

  const body = `
    <p style="color:#374151;margin:0 0 16px;">
      You're now subscribed to status updates for 
      <strong>${statusPage.name}</strong>. We'll notify you when components 
      change status or when incidents are reported.
    </p>
    <p style="color:#374151;margin:0;">
      <a href="https://${statusPage.subdomain}.statushub.io" style="color:${primaryColor};text-decoration:none;font-weight:600;">
        View status page →
      </a>
    </p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Subscribed to ${statusPage.name} status updates`,
    html: baseTemplate(primaryColor, `You're subscribed! 🎉`, body, unsubscribeUrl),
  });
}
