import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { reportError } from '../services/reportError';
import { deferredScreens } from './deferredScreen.web';
import type { Screens } from './screens';

jest.mock('../services/reportError', () => ({ reportError: jest.fn() }));

const fakeScreens = {
  SCREENS: {
    HomeRoute: ({ interests }: { interests: readonly string[] }) => <Text>Home: {interests.join(', ')}</Text>,
    LogbookRoute: () => <Text>Logbook</Text>,
  } as unknown as Screens,
  GestureRoot: View,
};

describe('deferredScreens', () => {
  it('shows a blank screen until the screens arrive, then the screen with its props', async () => {
    const Home = deferredScreens(async () => fakeScreens).screen('HomeRoute');

    await render(<Home interests={['space', 'history']} />);

    expect(await screen.findByText('Home: space, history')).toBeTruthy();
  });

  it('fetches the screens once, however many are shown or preloaded', async () => {
    const load = jest.fn(async () => fakeScreens);
    const deferred = deferredScreens(load);
    const Home = deferred.screen('HomeRoute');
    const Logbook = deferred.screen('LogbookRoute');

    deferred.preload();
    await render(
      <>
        <Home interests={['space']} />
        <Logbook />
      </>,
    );
    await screen.findByText('Logbook');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports a failed preload and fetches again next time', async () => {
    const failure = new Error('chunk failed');
    const load = jest.fn().mockRejectedValueOnce(failure).mockResolvedValue(fakeScreens);
    const deferred = deferredScreens(load);

    deferred.preload();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const Logbook = deferred.screen('LogbookRoute');
    await render(<Logbook />);

    expect(reportError).toHaveBeenCalledWith('routes.preload', failure);
    expect(await screen.findByText('Logbook')).toBeTruthy();
  });
});
