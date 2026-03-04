import { db } from '@statushub/db';
import { users, statusPages, components } from '@statushub/db/schema';
import { eq, count } from 'drizzle-orm';
import { PLAN_LIMITS, type Plan } from './stripe';

/**
 * Get the plan for a user, defaulting to 'free'.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const [user] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return 'free';
  const plan = user.plan as Plan;
  return plan in PLAN_LIMITS ? plan : 'free';
}

/**
 * Check if a user can create another status page.
 */
export async function canCreateStatusPage(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const plan = await getUserPlan(userId);
  const limit = PLAN_LIMITS[plan].pages;

  const [result] = await db
    .select({ count: count() })
    .from(statusPages)
    .where(eq(statusPages.userId, userId));

  const current = result?.count ?? 0;

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows up to ${limit} status page(s). Please upgrade to create more.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if a status page can have another component added.
 */
export async function canAddComponent(statusPageId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Get the status page to find the owner's plan
  const [page] = await db
    .select({ userId: statusPages.userId })
    .from(statusPages)
    .where(eq(statusPages.id, statusPageId))
    .limit(1);

  if (!page) {
    return { allowed: false, reason: 'Status page not found' };
  }

  const plan = await getUserPlan(page.userId);
  const limit = PLAN_LIMITS[plan].components;

  const [result] = await db
    .select({ count: count() })
    .from(components)
    .where(eq(components.statusPageId, statusPageId));

  const current = result?.count ?? 0;

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows up to ${limit} components per page. Please upgrade to add more.`,
    };
  }

  return { allowed: true };
}
