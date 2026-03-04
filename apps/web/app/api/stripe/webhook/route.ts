import { NextRequest, NextResponse } from 'next/server';
import { db } from '@statushub/db';
import { users } from '@statushub/db/schema';
import { eq } from 'drizzle-orm';
import { getStripe } from '@/lib/stripe';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (!userId || !plan) break;

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        await db
          .update(users)
          .set({
            plan,
            stripeSubscriptionId: subscriptionId ?? null,
            stripeCustomerId: typeof session.customer === 'string'
              ? session.customer
              : (session.customer?.id ?? null),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        const plan = subscription.metadata?.plan ?? 'pro';
        const isActive = ['active', 'trialing'].includes(subscription.status);

        await db
          .update(users)
          .set({
            plan: isActive ? plan : 'free',
            stripeSubscriptionId: subscription.id,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        await db
          .update(users)
          .set({
            plan: 'free',
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
