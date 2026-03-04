import { NextRequest, NextResponse } from 'next/server';
import { db } from '@statushub/db';
import { subscribers, statusPages } from '@statushub/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { sendConfirmationEmail, verifyUnsubscribeToken } from '@/lib/alerts';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  statusPageId: z.string().uuid('Invalid status page ID'),
});

// POST /api/subscribe - Subscribe to status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = subscribeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { email, statusPageId } = validation.data;

    // Verify the status page exists
    const [page] = await db
      .select()
      .from(statusPages)
      .where(eq(statusPages.id, statusPageId))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: 'Status page not found' }, { status: 404 });
    }

    // Check for existing active subscription
    const [existing] = await db
      .select()
      .from(subscribers)
      .where(
        and(
          eq(subscribers.statusPageId, statusPageId),
          eq(subscribers.email, email)
        )
      )
      .limit(1);

    if (existing) {
      if (!existing.unsubscribedAt) {
        return NextResponse.json(
          { message: 'Already subscribed' },
          { status: 200 }
        );
      }
      // Re-subscribe: clear unsubscribedAt
      await db
        .update(subscribers)
        .set({ unsubscribedAt: null, verified: true })
        .where(eq(subscribers.id, existing.id));

      await sendConfirmationEmail(email, existing.id, page).catch(console.error);
      return NextResponse.json({ message: 'Resubscribed successfully' }, { status: 200 });
    }

    // Create new subscriber
    const [newSubscriber] = await db
      .insert(subscribers)
      .values({
        statusPageId,
        email,
        verified: true, // Auto-verified for now
      })
      .returning();

    // Send confirmation email
    await sendConfirmationEmail(email, newSubscriber.id, page).catch(console.error);

    return NextResponse.json(
      { message: 'Subscribed successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// DELETE /api/subscribe?token=<token>&id=<subscriberId> - Unsubscribe
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get('token');
    const subscriberId = searchParams.get('id');

    if (!token || !subscriberId) {
      return NextResponse.json(
        { error: 'Missing token or subscriber ID' },
        { status: 400 }
      );
    }

    // Verify HMAC token
    if (!verifyUnsubscribeToken(subscriberId, token)) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 });
    }

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1);

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    if (subscriber.unsubscribedAt) {
      return NextResponse.json({ message: 'Already unsubscribed' }, { status: 200 });
    }

    await db
      .update(subscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(subscribers.id, subscriberId));

    return NextResponse.json({ message: 'Unsubscribed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
