import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './errors';

/** Every successful response has this envelope. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function paginated<T>(items: T[], page: number, limit: number, total: number) {
  return NextResponse.json({
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  });
}

/**
 * Single place where errors become responses. Wrap every route handler
 * in this so an unexpected throw never leaks a stack trace to the client.
 */
export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some fields are invalid',
          details: err.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  console.error('[unhandled]', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    { status: 500 },
  );
}

/**
 * Next 15+ passes dynamic route params as a Promise. Await them:
 *   export const GET = route(async (req, ctx: RouteCtx<{ id: string }>) => {
 *     const { id } = await ctx.params;
 *   });
 */
export type RouteCtx<P extends Record<string, string>> = { params: Promise<P> };

/** Usage: export const GET = route(async (req) => ok(...)) */
export function route<Ctx>(
  handler: (req: Request, ctx: Ctx) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}
