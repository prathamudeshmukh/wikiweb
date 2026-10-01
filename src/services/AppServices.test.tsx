import { renderHook } from '@testing-library/react-native';
import { createAppServices, useAppServices } from './AppServices';

describe('createAppServices', () => {
  it('explains what to configure when the Wikipedia contact is missing', () => {
    const result = createAppServices(undefined);

    expect(result).toEqual({ ok: false, problem: expect.stringContaining('EXPO_PUBLIC_WIKI_API_CONTACT') });
  });

  it('treats a blank contact as missing', () => {
    expect(createAppServices('   ').ok).toBe(false);
  });

  it('builds the API, interests store and journey session when configured', () => {
    const result = createAppServices('https://example.org/tangent');

    expect(result.ok && typeof result.services.api.hydrate).toBe('function');
    expect(result.ok && typeof result.services.interests.load).toBe('function');
    expect(result.ok && result.services.journeys.getState().active).toBeNull();
  });
});

describe('useAppServices', () => {
  it('refuses to be used outside its provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useAppServices())).rejects.toThrow(/inside AppServicesProvider/);
  });
});
