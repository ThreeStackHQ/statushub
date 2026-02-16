import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@statushub/db';
import { statusPages, components } from '@statushub/db/schema';
import { eq, and } from 'drizzle-orm';
import { createComponentSchema } from '@/lib/validators/status-page';

// POST /api/pages/:id/components - Add a component to a status page
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify status page ownership
    const [page] = await db
      .select()
      .from(statusPages)
      .where(
        and(
          eq(statusPages.id, params.id),
          eq(statusPages.userId, session.user.id)
        )
      )
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: 'Status page not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createComponentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    // Create component
    const [newComponent] = await db
      .insert(components)
      .values({
        statusPageId: params.id,
        ...validationResult.data,
      })
      .returning();

    return NextResponse.json({ component: newComponent }, { status: 201 });
  } catch (error) {
    console.error('Error creating component:', error);
    return NextResponse.json(
      { error: 'Failed to create component' },
      { status: 500 }
    );
  }
}

// GET /api/pages/:id/components - List all components for a status page
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify status page ownership
    const [page] = await db
      .select()
      .from(statusPages)
      .where(
        and(
          eq(statusPages.id, params.id),
          eq(statusPages.userId, session.user.id)
        )
      )
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: 'Status page not found' }, { status: 404 });
    }

    // Fetch components
    const pageComponents = await db
      .select()
      .from(components)
      .where(eq(components.statusPageId, params.id))
      .orderBy(components.sortOrder, components.createdAt);

    return NextResponse.json({ components: pageComponents }, { status: 200 });
  } catch (error) {
    console.error('Error fetching components:', error);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}
