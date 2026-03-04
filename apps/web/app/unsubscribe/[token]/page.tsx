import { db } from '@statushub/db';
import { subscribers } from '@statushub/db/schema';
import { eq } from 'drizzle-orm';
import { verifyUnsubscribeToken } from '@/lib/alerts';

interface UnsubscribePageProps {
  params: { token: string };
  searchParams: { id?: string };
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: UnsubscribePageProps) {
  const { token } = params;
  const subscriberId = searchParams.id;

  if (!subscriberId) {
    return <ErrorMessage message="Invalid unsubscribe link — missing subscriber ID." />;
  }

  // Verify token
  if (!verifyUnsubscribeToken(subscriberId, token)) {
    return <ErrorMessage message="Invalid or expired unsubscribe link." />;
  }

  // Fetch subscriber
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);

  if (!subscriber) {
    return <ErrorMessage message="Subscriber not found." />;
  }

  // Already unsubscribed
  if (subscriber.unsubscribedAt) {
    return (
      <ConfirmationLayout>
        <p className="text-gray-600 mt-2">
          You have already been unsubscribed from status updates.
        </p>
      </ConfirmationLayout>
    );
  }

  // Mark as unsubscribed
  await db
    .update(subscribers)
    .set({ unsubscribedAt: new Date() })
    .where(eq(subscribers.id, subscriberId));

  return (
    <ConfirmationLayout>
      <p className="text-gray-600 mt-2">
        You have been successfully unsubscribed from status updates for{' '}
        <strong>{subscriber.email}</strong>.
      </p>
      <p className="text-sm text-gray-500 mt-4">
        You will no longer receive status or incident notifications.
      </p>
    </ConfirmationLayout>
  );
}

function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-semibold text-gray-900">Unsubscribed</h1>
        {children}
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h1 className="text-xl font-semibold text-gray-900">Error</h1>
        <p className="text-gray-600 mt-2">{message}</p>
      </div>
    </div>
  );
}
