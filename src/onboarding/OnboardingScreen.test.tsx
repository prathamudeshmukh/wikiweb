import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingScreen } from './OnboardingScreen';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  const onDone = jest.fn();
  const onJustStart = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <OnboardingScreen onDone={onDone} onJustStart={onJustStart} />
    </SafeAreaProvider>,
  );
  return { onDone, onJustStart };
}

async function pick(...names: string[]) {
  for (const name of names) await fireEvent.press(screen.getByRole('checkbox', { name }));
}

describe('OnboardingScreen', () => {
  it('opens on the pitch, so a cold visitor knows what this is', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: 'Wikipedia, one swipe at a time' })).toBeOnTheScreen();
  });

  it('just starts with nothing picked', async () => {
    const { onDone, onJustStart } = await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Just start' }));

    expect(onJustStart).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('counts down to three picks instead of offering to just start', async () => {
    const { onDone, onJustStart } = await renderScreen();

    await pick('Space', 'History');
    await fireEvent.press(screen.getByRole('button', { name: 'Pick 1 more' }));

    expect(onDone).not.toHaveBeenCalled();
    expect(onJustStart).not.toHaveBeenCalled();
  });

  it('sets off with the picked topics in the order they were picked', async () => {
    const { onDone } = await renderScreen();

    await pick('Space', 'History', 'Art');
    await fireEvent.press(screen.getByRole('button', { name: 'Set off' }));

    expect(onDone).toHaveBeenCalledWith(['space', 'history', 'art']);
  });

  it('offers to just start again once every pick is undone', async () => {
    await renderScreen();

    await pick('Space', 'Space');

    expect(screen.getByRole('button', { name: 'Just start' })).toBeEnabled();
  });

  it('un-picks a topic when tapped again', async () => {
    await renderScreen();

    await pick('Space', 'Space');

    expect(screen.getByRole('checkbox', { name: 'Space' })).not.toBeChecked();
  });
});
