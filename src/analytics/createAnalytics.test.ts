import { type AnalyticsConnector, createAnalytics } from './createAnalytics';

const NOOP = { track: jest.fn(), screen: jest.fn(), setOptedOut: jest.fn() };
const connector = () => jest.fn<ReturnType<AnalyticsConnector>, Parameters<AnalyticsConnector>>(() => ({ analytics: NOOP, client: null }));

describe('createAnalytics', () => {
  afterEach(() => jest.restoreAllMocks());

  it('is off without a project key', () => {
    const connect = connector();

    const { client, analytics } = createAnalytics({ key: ' ', host: undefined, isDev: false }, connect);
    analytics.track({ name: 'first_return', properties: { route: 'swipe' } });

    expect(client).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });

  it('logs instead of sending in development', () => {
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const connect = connector();

    const { analytics } = createAnalytics({ key: 'phc_key', host: undefined, isDev: true }, connect);
    analytics.track({ name: 'first_return', properties: { route: 'swipe' } });

    expect(connect).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('[analytics] first_return', { route: 'swipe' });
  });

  it('stays quiet in development once opted out', () => {
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const { analytics } = createAnalytics({ key: undefined, host: undefined, isDev: true }, connector());

    analytics.setOptedOut(true);
    analytics.screen('/logbook');

    expect(log).not.toHaveBeenCalled();
  });

  it('connects to PostHog on the EU host by default', () => {
    const connect = connector();

    createAnalytics({ key: ' phc_key ', host: '', isDev: false }, connect);

    expect(connect).toHaveBeenCalledWith({ key: 'phc_key', host: 'https://eu.i.posthog.com' });
  });

  it('connects to the configured host when there is one', () => {
    const connect = connector();

    createAnalytics({ key: 'phc_key', host: 'https://ph.example.org', isDev: false }, connect);

    expect(connect).toHaveBeenCalledWith({ key: 'phc_key', host: 'https://ph.example.org' });
  });
});
