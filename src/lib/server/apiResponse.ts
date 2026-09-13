/**
 * apiResponse.ts — Standardized API response helpers.
 *
 * All API routes should use these helpers to ensure consistent response
 * shapes: { data } for success, { error } for errors.
 */
import { json } from '@sveltejs/kit';

/**
 * Standard error response.
 * Always returns { error: string } with the given status.
 */
export function apiError(message: string, status: number = 500) {
  return json({ error: message }, { status });
}

/**
 * Standard success response.
 * Returns { data } with the given status (default 200).
 */
export function apiOk<T>(data: T, status: number = 200) {
  return json(data, { status });
}

/**
 * Standard created response (201).
 */
export function apiCreated<T>(data: T) {
  return json(data, { status: 201 });
}

/**
 * Standard 404 response.
 */
export function apiNotFound(entity: string = 'Resource') {
  return json({ error: `${entity} not found` }, { status: 404 });
}

/**
 * Standard 401 unauthorized response.
 */
export function apiUnauthorized(message: string = 'Unauthorized') {
  return json({ error: message }, { status: 401 });
}

/**
 * Standard 403 forbidden response.
 */
export function apiForbidden(message: string = 'Insufficient permissions') {
  return json({ error: message }, { status: 403 });
}

/**
 * Parse JSON body safely, returning null on failure.
 */
export async function parseJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
