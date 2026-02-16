import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@statushub/db';
import { statusPages } from '@statushub/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateStatusPageSchema } from '@/lib/validators/status-page';

// GET /api/pages/:id - Get a specific status page
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({ page }, { status: 200 });
  } catch (error) {
    console.error('Error fetching status page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status page' },
      { status: 500 }
    );
  }
}

// PATCH /api/pages/:id - Update a status page
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const [existingPage] = await db
      .select()
      .from(statusPages)
      .where(
        and(
          eq(statusPages.id, params.id),
          eq(statusPages.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingPage) {
      return NextResponse.json({ error: 'Status page not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateStatusPageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    // Update status page
    const [updatedPage] = await db
      .update(statusPages)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(eq(statusPages.id, params.id))
      .returning();

    return NextResponse.json({ page: updatedPage }, { status: 200 });
  } catch (error) {
    console.error('Error updating status page:', error);
    return NextResponse.json(
      { error: 'Failed to update status page' },
      { status: 500 }
    );
  }
}

// DELETE /api/pages/:id - Delete a status page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const [existingPage] = await db
      .select()
      .from(statusPages)
      .where(
        and(
          eq(statusPages.id, params.id),
          eq(statusPages.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingPage) {
      return NextResponse.json({ error: 'Status page not found' }, { status: 404 });
    }

    // Delete status page (cascade will handle components, incidents, etc.)
    await db.delete(statusPages).where(eq(statusPages.id, params.id));

    return NextResponse.json(
      { message: 'Status page deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting status page:', error);
    return NextResponse.json(
      { error: 'Failed to delete status page' },
      { status: 500 }
    );
  }
}
