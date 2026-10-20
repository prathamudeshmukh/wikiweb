import type { CaptureResult, PostHogConfig } from 'posthog-js';
import { connectPostHogWeb, type PostHogJsFactory, withoutPageAddress } from './posthogWeb';

function fakeClient() {
  return { capture: jest.fn(), register: jest.fn(), opt_out_capturing: jest.fn(), opt_in_capturing: jest.fn() };
}

function connect() {
  const client = fakeClient();
  const clientFor: jest.MockedFunction<PostHogJsFactory> = jest.fn((_key: string, _config: Partial<PostHogConfig>) => client);
  const { analytics } = connectPostHogWeb(clientFor)({ key: 'phc_key', host: 'https://eu.i.posthog.com' });
  return { client, clientFor, analytics };
}

const captured = (properties: CaptureResult['properties'], extra: Partial<CaptureResult> = {}): CaptureResult => ({ uuid: 'u1', event: 'hop', properties, ...extra });

describe('connectPostHogWeb', () => {
  it('keeps PostHog to localStorage, with autocapture, page views and replay off', () => {
    const { clientFor } = connect();

    expect(clientFor).toHaveBeenCalledWith(
      'phc_key',
      expect.objectContaining({ api_host: 'https://eu.i.posthog.com', persistence: 'localStorage', autocapture: false, capture_pageview: false, disable_session_recording: true, person_profiles: 'never' }),
    );
  });

  it('sends each event straight away, so opting out leaves none waiting', () => {
    const { clientFor } = connect();

    expect(clientFor).toHaveBeenCalledWith('phc_key', expect.objectContaining({ request_batching: false }));
  });

  it('tags every event as coming from the web, without GeoIP', () => {
    const { client } = connect();

    expect(client.register).toHaveBeenCalledWith({ platform: 'web', $geoip_disable: true });
  });

  it('sends events, and screens the way native PostHog does', () => {
    const { client, analytics } = connect();

    analytics.track({ name: 'first_return', properties: { route: 'swipe' } });
    analytics.screen('/expedition/[id]');

    expect(client.capture).toHaveBeenCalledWith('first_return', { route: 'swipe' });
    expect(client.capture).toHaveBeenCalledWith('$screen', { $screen_name: '/expedition/[id]' });
  });

  it('passes opting out and back in to PostHog', () => {
    const { client, analytics } = connect();

    analytics.setOptedOut(true);
    analytics.setOptedOut(false);

    expect(client.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(client.opt_in_capturing).toHaveBeenCalledTimes(1);
  });

  it('has no client for touch autocapture', () => {
    const client = fakeClient();

    const setup = connectPostHogWeb(() => client)({ key: 'phc_key', host: 'https://eu.i.posthog.com' });

    expect(setup.client).toBeNull();
  });
});

describe('withoutPageAddress', () => {
  // A reader URL names the article (`/reader?title=Octopus`); titles go only on feed-quality events (SPEC.md §11).
  it('removes the page address and title from an event', () => {
    const event = captured({ $current_url: 'https://tangent.app/reader?title=Octopus', $pathname: '/reader', title: 'Octopus', $host: 'tangent.app', route: 'swipe' });

    expect(withoutPageAddress(event)?.properties).toEqual({ $host: 'tangent.app', route: 'swipe' });
  });

  it('removes the first and session-entry addresses, wherever they are set', () => {
    const event = captured(
      { $session_entry_url: 'https://tangent.app/reader?title=Octopus', $session_entry_pathname: '/reader' },
      { $set_once: { $initial_current_url: 'https://tangent.app/reader?title=Octopus', $initial_pathname: '/reader', $initial_referrer: 'https://example.org' } },
    );

    const cleaned = withoutPageAddress(event);

    expect(cleaned?.properties).toEqual({});
    expect(cleaned?.$set_once).toEqual({ $initial_referrer: 'https://example.org' });
  });

  it('keeps where the visitor came from', () => {
    const event = captured({ $referrer: 'https://example.org/', $referring_domain: 'example.org' });

    expect(withoutPageAddress(event)?.properties).toEqual({ $referrer: 'https://example.org/', $referring_domain: 'example.org' });
  });

  it('passes a dropped event through as dropped', () => {
    expect(withoutPageAddress(null)).toBeNull();
  });
});
