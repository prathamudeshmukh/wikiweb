import { renderHook } from '@testing-library/react-native';
import type { PostHog } from 'posthog-react-native';
import { createAppServices, type AppConfig, useAppServices } from './AppServices';
import { reportError, setErrorSink } from './reportError';

const CONFIG: AppConfig = { wikiContact: 'https://example.org/tangent', posthogKey: undefined, posthogHost: undefined, isDev: false };

describe('createAppServices', () => {
  afterEach(() => {
    setErrorSink(null);
    jest.restoreAllMocks();
  });

  it('explains what to configure when the Wikipedia contact is missing', () => {
    const result = createAppServices({ ...CONFIG, wikiContact: undefined });

    expect(result).toEqual({ ok: false, problem: expect.stringContaining('EXPO_PUBLIC_WIKI_API_CONTACT') });
  });

  it('treats a blank contact as missing', () => {
    expect(createAppServices({ ...CONFIG, wikiContact: '   ' }).ok).toBe(false);
  });

  it('builds the API, interests store and journey session when configured', () => {
    const result = createAppServices(CONFIG);

    expect(result.ok && typeof result.services.api.hydrate).toBe('function');
    expect(result.ok && typeof result.services.interests.load).toBe('function');
    expect(result.ok && result.services.journeys.getState().active).toBeNull();
  });

  it('runs without analytics when no PostHog key is set', () => {
    const clientFor = jest.fn();

    const result = createAppServices(CONFIG, clientFor);

    expect(result.ok && result.services.analyticsClient).toBeNull();
    expect(clientFor).not.toHaveBeenCalled();
  });

  it('sends reported errors to PostHog as a title-free app_error', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const client = { capture: jest.fn() };
    createAppServices({ ...CONFIG, posthogKey: 'phc_key' }, () => client as unknown as PostHog);

    reportError('homeRefresh', new RangeError('Octopus'));

    expect(client.capture).toHaveBeenCalledWith('app_error', { scope: 'homeRefresh', reason: 'RangeError' });
  });
});

describe('useAppServices', () => {
  it('refuses to be used outside its provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useAppServices())).rejects.toThrow(/inside AppServicesProvider/);
  });
});
