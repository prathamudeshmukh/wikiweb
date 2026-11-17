import { LaneCancelledError } from '../wiki-api/requestBudget';
import { errorReason } from './errorReason';
import type { AnalyticsEvent } from './events';

/**
 * The `app_error` event for a reported error, or null when there is nothing to report. A dropped prefetch
 * is the request budget doing its job (SPEC.md §6), and counting it buried real failures on the dashboard.
 */
export function appErrorEvent(scope: string, error: unknown): AnalyticsEvent | null {
  if (error instanceof LaneCancelledError) return null;
  return { name: 'app_error', properties: { scope, reason: errorReason(error) } };
}
