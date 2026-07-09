/**
 * Typed error factories for consistent tRPC error responses.
 * Usage: `throw notFound("Lead")` → 404 "Lead not found"
 * @module
 */

import { TRPCError } from "@trpc/server";

/** 404 - Resource not found */
export function notFound(resource: string): TRPCError {
  return new TRPCError({
    code: "NOT_FOUND",
    message: `${resource} not found`,
  });
}

/** 401 - Authentication required */
export function unauthorized(message = "Authentication required"): TRPCError {
  return new TRPCError({
    code: "UNAUTHORIZED",
    message,
  });
}

/** 403 - Insufficient permissions */
export function forbidden(message = "Insufficient permissions"): TRPCError {
  return new TRPCError({
    code: "FORBIDDEN",
    message,
  });
}

/** 400 - Bad request / validation error */
export function badRequest(message: string): TRPCError {
  return new TRPCError({
    code: "BAD_REQUEST",
    message,
  });
}

/** 429 - Rate limit exceeded */
export function rateLimit(): TRPCError {
  return new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Rate limit exceeded. Please try again later.",
  });
}

/** 500 - Internal server error */
export function internal(message: string): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
  });
}
