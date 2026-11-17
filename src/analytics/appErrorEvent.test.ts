import { WikiApiError } from '../wiki-api/http';
import { LaneCancelledError } from '../wiki-api/requestBudget';
import { appErrorEvent } from './appErrorEvent';

describe('appErrorEvent', () => {
  it('describes a failure by scope and title-free reason', () => {
    const error = new WikiApiError('Wikipedia request failed (429).', { retryable: true, status: 429 });

    expect(appErrorEvent('feed.source', error)).toEqual({ name: 'app_error', properties: { scope: 'feed.source', reason: 'http_429' } });
  });

  it('sends nothing for a dropped prefetch, which is the request budget working as intended', () => {
    expect(appErrorEvent('feed.source', new LaneCancelledError())).toBeNull();
  });
});
