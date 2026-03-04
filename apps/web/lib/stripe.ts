import Stripe from 'stripe';

// Lazy singleton
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });
  }
  return _stripe;
}

// Plan limits
export const PLAN_LIMITS = {
  free: {
    pages: 1,
    components: 3,
    customDomain: false,
  },
  pro: {
    pages: 5,
    components: 20,
    customDomain: true,
  },
  business: {
    pages: 999,
    components: 999,
    customDomain: true,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  business: process.env.STRIPE_PRICE_BUSINESS ?? '',
};
