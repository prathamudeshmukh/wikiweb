import { ZodError } from 'zod';
import { WikiApiError } from '../wiki-api/http';
import { LaneCancelledError } from '../wiki-api/requestBudget';

const CLASS_NAME = /^[A-Za-z]+$/;

/**
 * A fixed, title-free reason for an error. Messages are never used: they can carry request URLs and
 * article titles (SPEC.md §11).
 */
export function errorReason(error: unknown): string {
  if (error instanceof WikiApiError) {
    if (error.status !== null) return `http_${error.status}`;
    if (error.code !== null) return `api_${error.code}`;
    return 'network';
  }
  if (error instanceof ZodError) return 'parse';
  if (error instanceof LaneCancelledError) return 'cancelled';
  if (error instanceof Error && CLASS_NAME.test(error.name)) return error.name;
  return 'unknown';
}
