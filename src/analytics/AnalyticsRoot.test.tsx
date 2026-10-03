import { act, render, waitFor } from '@testing-library/react-native';
import { useSegments } from 'expo-router';
import { AppState, type AppStateStatus, Text } from 'react-native';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import { testServices } from '../__testing__/renderWithServices';
import { AppServicesProvider } from '../services/AppServices';
import { AnalyticsRoot } from './AnalyticsRoot';

jest.mock('expo-router', () => ({ useSegments: jest.fn(() => []) }));

function captureAppState() {
  let emit: (status: AppStateStatus) => void = () => undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    emit = listener;
    return { remove: jest.fn() };
  });
  return (status: AppStateStatus) => emit(status);
}

async function renderRoot(services = testServices(fakeWikiApi({}).api)) {
  const rendered = await render(
    <AppServicesProvider services={services}>
      <AnalyticsRoot>
        <Text>app</Text>
      </AnalyticsRoot>
    </AppServicesProvider>,
  );
  return { ...rendered, services };
}

describe('AnalyticsRoot', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends screen views by route pattern', async () => {
    jest.mocked(useSegments).mockReturnValue(['expedition', '[id]'] as never);

    const { services } = await renderRoot();

    expect(services.analytics.screens()).toEqual(['/expedition/[id]']);
  });

  it('summarises an expedition under way when the app goes to the background', async () => {
    const emit = captureAppState();
    const services = testServices(fakeWikiApi({}).api);
    services.journeys.hop({ fromNodeId: null, page: { pageId: idOf('Octopus'), title: 'Octopus', tileId: null, territory: null, thumbnailUrl: null }, via: 'swipe' });
    await renderRoot(services);

    await act(() => emit('background'));

    expect(services.analytics.named('expedition_ended')).toEqual([expect.objectContaining({ ended_by: 'background', node_count: 1 })]);
  });

  it('applies the saved opt-out at startup', async () => {
    const services = testServices(fakeWikiApi({}).api);
    await services.analyticsConsent.setOptedOut(true);
    services.analytics.setOptedOut(false);

    await renderRoot(services);

    await waitFor(() => expect(services.analytics.optedOut()).toBe(true));
  });
});
