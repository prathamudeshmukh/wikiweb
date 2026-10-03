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
});
