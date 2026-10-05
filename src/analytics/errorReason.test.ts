import { z } from 'zod';
import { WikiApiError } from '../wiki-api/http';
import { LaneCancelledError } from '../wiki-api/requestBudget';
import { errorReason } from './errorReason';

describe('errorReason', () => {
  it('names HTTP failures by status', () => {
    expect(errorReason(new WikiApiError('Wikipedia request failed (429).', { retryable: true, status: 429 }))).toBe('http_429');
  });

  it('names Action API failures by their code', () => {
    expect(errorReason(new WikiApiError('Wikipedia: Invalid title "Ink"', { retryable: false, code: 'invalidtitle' }))).toBe('api_invalidtitle');
  });

  it('treats a Wikipedia error with neither status nor code as a network failure', () => {
    expect(errorReason(new WikiApiError('Could not reach Wikipedia.', { retryable: true }))).toBe('network');
  });

  it('names parse and cancellation failures', () => {
    expect(errorReason(z.string().safeParse(1).error)).toBe('parse');
    expect(errorReason(new LaneCancelledError())).toBe('cancelled');
  });

  it('falls back to the error class, never its message', () => {
    expect(errorReason(new RangeError('Requests accept at most 20 pages: Octopus, Squid'))).toBe('RangeError');
  });

  it('reports values that are not errors as unknown', () => {
    expect(errorReason('Octopus failed')).toBe('unknown');
  });
});
