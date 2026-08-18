/** Errors that map cleanly onto HTTP responses. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const BadRequest = (msg: string, details?: unknown) =>
  new ApiError(400, 'BAD_REQUEST', msg, details);

export const Unauthorized = (msg = 'Authentication required') =>
  new ApiError(401, 'UNAUTHORIZED', msg);

export const Forbidden = (msg = 'You do not have permission to do that') =>
  new ApiError(403, 'FORBIDDEN', msg);

export const NotFound = (msg = 'Not found') =>
  new ApiError(404, 'NOT_FOUND', msg);

export const Conflict = (msg: string) =>
  new ApiError(409, 'CONFLICT', msg);

export const TooManyRequests = (msg = 'Too many requests. Please try again shortly.') =>
  new ApiError(429, 'RATE_LIMITED', msg);
