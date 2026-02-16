import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@statushub/db';
import { statusPages } from '@statushub/db/schema';
import { eq } from 'drizzle-orm';
import { createStatusPageSchema } from '@/lib/validators/status-page';

// GET /api/pages - List all status pages for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pages = await db
      .select()
      .from(statusPages)
      .where(eq(statusPages.userId, session.user.id))
      .orderBy(statusPages.createdAt);

    return NextResponse.json({ pages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching status pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status pages' },
      { status: 500 }
    );
  }
}

// POST /api/pages - Create a new status page
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createStatusPageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, subdomain, logoUrl, primaryColor } = validationResult.data;

    // Check if subdomain is already taken
    const [existingPage] = await db
      .select()
      .from(statusPages)
      .where(eq(statusPages.subdomain, subdomain))
      .limit(1);

    if (existingPage) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 400 }
      );
    }

    // Create status page
    const [newPage] = await db
      .insert(statusPages)
      .values({
        userId: session.user.id,
        name,
        subdomain,
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || '#3b82f6',
      })
      .returning();

    return NextResponse.json({ page: newPage }, { status: 201 });
  } catch (error) {
    console.error('Error creating status page:', error);
    return NextResponse.json(
      { error: 'Failed to create status page' },
      { status: 500 }
    );
  }
}
