import { type PostHog, type PostHogOptions, PostHogPersistedProperty } from 'posthog-react-native';
import { connectPostHogNative, type PostHogFactory, withoutLaunchUrl } from './posthogNative';

function fakeClient() {
  const done = () => Promise.resolve();
  return { capture: jest.fn(), screen: jest.fn(done), optIn: jest.fn(done), optOut: jest.fn(done), setPersistedProperty: jest.fn() };
}

function connect() {
  const fake = fakeClient();
  const clientFor: jest.MockedFunction<PostHogFactory> = jest.fn((_key: string, _options: PostHogOptions) => fake as unknown as PostHog);
  const setup = connectPostHogNative(clientFor)({ key: 'phc_key', host: 'https://eu.i.posthog.com' });
  return { fake, clientFor, ...setup };
}

describe('connectPostHogNative', () => {
  it('opens PostHog with profiles, GeoIP and replay off', () => {
    const { clientFor } = connect();

    expect(clientFor).toHaveBeenCalledWith('phc_key', expect.objectContaining({ host: 'https://eu.i.posthog.com', personProfiles: 'never', disableGeoip: true, enableSessionReplay: false }));
  });

  it('sends events and screens, and hands the client over for touch autocapture', () => {
    const { fake, analytics, client } = connect();

    analytics.track({ name: 'first_return', properties: { route: 'crumb' } });
    analytics.screen('/logbook');

    expect(fake.capture).toHaveBeenCalledWith('first_return', { route: 'crumb' });
    expect(fake.screen).toHaveBeenCalledWith('/logbook');
    expect(client).toBe(fake);
  });

  it('passes opting out and back in to PostHog', () => {
    const { fake, analytics } = connect();

    analytics.setOptedOut(true);
    analytics.setOptedOut(false);

    expect(fake.optOut).toHaveBeenCalledTimes(1);
    expect(fake.optIn).toHaveBeenCalledTimes(1);
  });

  it('drops events still waiting to be sent when the user opts out', () => {
    const { fake, analytics } = connect();

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
