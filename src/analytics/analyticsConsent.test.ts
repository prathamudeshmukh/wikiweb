import { memoryAnalytics } from './__testing__/memoryAnalytics';
import { createAnalyticsConsent } from './analyticsConsent';

function memoryKv(initial: Record<string, string> = {}) {
  let values = initial;
  return {
    getItem: async (key: string) => values[key] ?? null,
    setItem: async (key: string, value: string) => {
      values = { ...values, [key]: value };
    },
    values: () => values,
  };
}

describe('analytics consent', () => {
  it('shares usage until the user opts out', async () => {
    const analytics = memoryAnalytics();

    const optedOut = await createAnalyticsConsent(memoryKv(), analytics).load();

    expect(optedOut).toBe(false);
    expect(analytics.optedOut()).toBe(false);
  });

  it('applies a saved opt-out on load', async () => {
    const analytics = memoryAnalytics();

    await createAnalyticsConsent(memoryKv({ analyticsOptOut: 'true' }), analytics).load();

    expect(analytics.optedOut()).toBe(true);
  });

  it('saves and applies a change', async () => {
    const kv = memoryKv();
    const analytics = memoryAnalytics();

    await createAnalyticsConsent(kv, analytics).setOptedOut(true);

    expect(kv.values()).toEqual({ analyticsOptOut: 'true' });
    expect(analytics.optedOut()).toBe(true);
  });

  it('treats an unreadable saved value as not opted out', async () => {
    const optedOut = await createAnalyticsConsent(memoryKv({ analyticsOptOut: 'maybe' }), memoryAnalytics()).load();

    expect(optedOut).toBe(false);
  });

  it('does not know the choice until it has loaded', () => {
    const consent = createAnalyticsConsent(memoryKv(), memoryAnalytics());

    expect(consent.isOptedOut()).toBeNull();
  });

  it('knows the latest choice once loaded or changed', async () => {
    const consent = createAnalyticsConsent(memoryKv({ analyticsOptOut: 'true' }), memoryAnalytics());
    await consent.load();

    await consent.setOptedOut(false);

    expect(consent.isOptedOut()).toBe(false);
  });

  it('tells subscribers when the choice changes, so every switch shows the same state', async () => {
    const consent = createAnalyticsConsent(memoryKv(), memoryAnalytics());
    const listener = jest.fn();
    consent.subscribe(listener);

    await consent.setOptedOut(true);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops telling a subscriber once it unsubscribes', async () => {
    const consent = createAnalyticsConsent(memoryKv(), memoryAnalytics());
    const listener = jest.fn();
    const unsubscribe = consent.subscribe(listener);

    unsubscribe();
    await consent.load();

    expect(listener).not.toHaveBeenCalled();
  });

  it('reads the saved choice once, however many screens ask for it at startup', async () => {
    const kv = memoryKv();
    const getItem = jest.spyOn(kv, 'getItem');
    const consent = createAnalyticsConsent(kv, memoryAnalytics());

    await Promise.all([consent.load(), consent.load()]);

    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('keeps a choice made while the saved one was still loading', async () => {
    let finishRead: (value: string | null) => void = () => undefined;
    const kv = { getItem: () => new Promise<string | null>((resolve) => (finishRead = resolve)), setItem: async () => undefined };
    const analytics = memoryAnalytics();
    const consent = createAnalyticsConsent(kv, analytics);
    const loading = consent.load();

    await consent.setOptedOut(true);
    finishRead(null);
    await loading;

    expect(consent.isOptedOut()).toBe(true);
    expect(analytics.optedOut()).toBe(true);
  });

  it('reads again after a failed read', async () => {
    const getItem = jest.fn().mockRejectedValueOnce(new Error('blocked')).mockResolvedValueOnce('true');
    const consent = createAnalyticsConsent({ getItem, setItem: async () => undefined }, memoryAnalytics());
    await expect(consent.load()).rejects.toThrow('blocked');

    const optedOut = await consent.load();

    expect(optedOut).toBe(true);
  });
});
