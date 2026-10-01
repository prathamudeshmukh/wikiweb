import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEFAULT_INTERESTS } from './interestSelection';
import { OnboardingScreen } from './OnboardingScreen';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  const onDone = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <OnboardingScreen onDone={onDone} />
    </SafeAreaProvider>,
  );
  return { onDone, setOff: () => screen.getByRole('button', { name: 'Set off' }) };
}

describe('OnboardingScreen', () => {
  it('keeps Set off disabled until three topics are picked', async () => {
    const { onDone, setOff } = await renderScreen();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Space' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'History' }));
    await fireEvent.press(setOff());

    expect(onDone).not.toHaveBeenCalled();
  });

  it('sets off with the picked topics in the order they were picked', async () => {
    const { onDone, setOff } = await renderScreen();

    for (const name of ['Space', 'History', 'Art']) await fireEvent.press(screen.getByRole('checkbox', { name }));
    await fireEvent.press(setOff());

    expect(onDone).toHaveBeenCalledWith(['space', 'history', 'art']);
  });

  it('un-picks a topic when tapped again', async () => {
    await renderScreen();
    const space = screen.getByRole('checkbox', { name: 'Space' });

    await fireEvent.press(space);
    await fireEvent.press(space);

    expect(screen.getByRole('checkbox', { name: 'Space' })).not.toBeChecked();
  });

  it('skips with the default topics', async () => {
    const { onDone } = await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));

    expect(onDone).toHaveBeenCalledWith(DEFAULT_INTERESTS);
  });
});
