import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@statushub/db';
import { components, statusPages } from '@statushub/db/schema';
import { eq } from 'drizzle-orm';
import { updateComponentSchema } from '@/lib/validators/status-page';

// GET /api/components/:id - Get a specific component
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch component with status page join to verify ownership
    const [component] = await db
      .select({
        component: components,
        statusPage: statusPages,
      })
      .from(components)
      .innerJoin(statusPages, eq(components.statusPageId, statusPages.id))
      .where(eq(components.id, params.id))
      .limit(1);

    if (!component) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    // Verify ownership
    if (component.statusPage.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ component: component.component }, { status: 200 });
  } catch (error) {
    console.error('Error fetching component:', error);
    return NextResponse.json(
      { error: 'Failed to fetch component' },
      { status: 500 }
    );
  }
}

// PATCH /api/components/:id - Update a component
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch component with status page join to verify ownership
    const [existing] = await db
      .select({
        component: components,
        statusPage: statusPages,
      })
      .from(components)
      .innerJoin(statusPages, eq(components.statusPageId, statusPages.id))
      .where(eq(components.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    // Verify ownership
    if (existing.statusPage.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateComponentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    // Update component
    const [updatedComponent] = await db
      .update(components)
      .set({
        ...validationResult.data,
        updatedAt: new Date(),
      })
      .where(eq(components.id, params.id))
      .returning();

    return NextResponse.json({ component: updatedComponent }, { status: 200 });
  } catch (error) {
    console.error('Error updating component:', error);
    return NextResponse.json(
      { error: 'Failed to update component' },
      { status: 500 }
    );
  }
}

// DELETE /api/components/:id - Delete a component
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch component with status page join to verify ownership
    const [existing] = await db
      .select({
        component: components,
        statusPage: statusPages,
      })
      .from(components)
      .innerJoin(statusPages, eq(components.statusPageId, statusPages.id))
      .where(eq(components.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    // Verify ownership
    if (existing.statusPage.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete component
    await db.delete(components).where(eq(components.id, params.id));

    return NextResponse.json(
      { message: 'Component deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting component:', error);
    return NextResponse.json(
      { error: 'Failed to delete component' },
      { status: 500 }
    );
  }
}
