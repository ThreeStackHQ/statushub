import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runMonitoringCycle } from '@/lib/monitoring';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.nextUrl.searchParams.get('secret') ?? '';

    const secretBuf = Buffer.from(secret, 'utf8');
    const providedBuf = Buffer.from(providedSecret, 'utf8');

    const isValid =
      secretBuf.length === providedBuf.length &&
      timingSafeEqual(secretBuf, providedBuf);

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checked, changed } = await runMonitoringCycle();

    return NextResponse.json({ checked, changed }, { status: 200 });
  } catch (error) {
    console.error('Monitoring cycle error:', error);
    return NextResponse.json({ error: 'Monitoring cycle failed' }, { status: 500 });
  }
}
