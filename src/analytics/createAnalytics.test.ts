import { type PostHog, PostHogPersistedProperty } from 'posthog-react-native';
import { createAnalytics, type PostHogFactory, withoutLaunchUrl } from './createAnalytics';

function fakeClient() {
  const done = () => Promise.resolve();
  return { capture: jest.fn(), screen: jest.fn(done), optIn: jest.fn(done), optOut: jest.fn(done), setPersistedProperty: jest.fn() };
}

const factoryFor = (client: ReturnType<typeof fakeClient>): PostHogFactory => jest.fn(() => client as unknown as PostHog);

describe('createAnalytics', () => {
  afterEach(() => jest.restoreAllMocks());

  it('is off without a project key', () => {
    const clientFor = factoryFor(fakeClient());

    const { client, analytics } = createAnalytics({ key: ' ', host: undefined, isDev: false }, clientFor);
    analytics.track({ name: 'first_return', properties: { route: 'swipe' } });

    expect(client).toBeNull();
    expect(clientFor).not.toHaveBeenCalled();
  });

  it('logs instead of sending in development', () => {
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const clientFor = factoryFor(fakeClient());

    const { client, analytics } = createAnalytics({ key: 'phc_key', host: undefined, isDev: true }, clientFor);
    analytics.track({ name: 'first_return', properties: { route: 'swipe' } });

    expect(client).toBeNull();
    expect(log).toHaveBeenCalledWith('[analytics] first_return', { route: 'swipe' });
  });

  it('stays quiet in development once opted out', () => {
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const { analytics } = createAnalytics({ key: undefined, host: undefined, isDev: true }, factoryFor(fakeClient()));

    analytics.setOptedOut(true);
    analytics.screen('/logbook');

    expect(log).not.toHaveBeenCalled();
  });

  it('sends to PostHog on the EU host by default, with profiles, GeoIP and replay off', () => {
    const fake = fakeClient();
    const clientFor = factoryFor(fake);

    const { analytics } = createAnalytics({ key: 'phc_key', host: undefined, isDev: false }, clientFor);
    analytics.track({ name: 'first_return', properties: { route: 'crumb' } });
    analytics.screen('/logbook');

    expect(clientFor).toHaveBeenCalledWith('phc_key', expect.objectContaining({ host: 'https://eu.i.posthog.com', personProfiles: 'never', disableGeoip: true, enableSessionReplay: false }));
    expect(fake.capture).toHaveBeenCalledWith('first_return', { route: 'crumb' });
    expect(fake.screen).toHaveBeenCalledWith('/logbook');
  });

  it('passes opting out and back in to PostHog', () => {
    const fake = fakeClient();
    const { analytics } = createAnalytics({ key: 'phc_key', host: 'https://ph.example.org', isDev: false }, factoryFor(fake));

    analytics.setOptedOut(true);
    analytics.setOptedOut(false);

    expect(fake.optOut).toHaveBeenCalledTimes(1);
    expect(fake.optIn).toHaveBeenCalledTimes(1);
  });

  it('drops events still waiting to be sent when the user opts out', () => {
    const fake = fakeClient();
    const { analytics } = createAnalytics({ key: 'phc_key', host: undefined, isDev: false }, factoryFor(fake));

    analytics.setOptedOut(true);

    expect(fake.setPersistedProperty).toHaveBeenCalledWith(PostHogPersistedProperty.Queue, null);
  });
});

describe('withoutLaunchUrl', () => {
  it('removes the launch URL from Application Opened', () => {
    const opened = { event: 'Application Opened', properties: { url: 'tangent://reader?title=Octopus', version: '1.0.0' } };

    expect(withoutLaunchUrl(opened)).toEqual({ event: 'Application Opened', properties: { version: '1.0.0' } });
  });

  it('leaves every other event alone', () => {
    const hop = { event: 'hop', properties: { url: 'kept' } };

    expect(withoutLaunchUrl(hop)).toBe(hop);
  });
});
