import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fakeWikiApi } from '../content/__testing__/fakeWikiApi';
import { testServices } from '../__testing__/renderWithServices';
import { AppServicesProvider } from '../services/AppServices';
import { useUsageSharing } from './useUsageSharing';

function renderSharing() {
  const services = testServices(fakeWikiApi({}).api);
  const wrapper = ({ children }: { children: ReactNode }) => <AppServicesProvider services={services}>{children}</AppServicesProvider>;
  return { services, rendered: renderHook(() => useUsageSharing(), { wrapper }) };
}

describe('useUsageSharing', () => {
  it('shares usage by default once the saved choice has loaded', async () => {
    const { result } = await renderSharing().rendered;

    await waitFor(() => expect(result.current.sharing).toBe(true));
  });

  it('opts analytics out when switched off, and remembers it', async () => {
    const { services, rendered } = renderSharing();
    const { result } = await rendered;
    await waitFor(() => expect(result.current.sharing).toBe(true));

    await act(() => result.current.setSharing(false));

    expect(result.current.sharing).toBe(false);
    expect(services.analytics.optedOut()).toBe(true);
    expect(await services.analyticsConsent.load()).toBe(true);
  });
});
