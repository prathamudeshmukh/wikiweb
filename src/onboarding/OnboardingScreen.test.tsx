import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingScreen } from './OnboardingScreen';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen({ sharing }: { sharing: boolean | undefined } = { sharing: true }) {
  const onDone = jest.fn();
  const onJustStart = jest.fn();
  const onOpenPrivacy = jest.fn();
  const usage = { sharing, setSharing: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <OnboardingScreen onDone={onDone} onJustStart={onJustStart} onOpenPrivacy={onOpenPrivacy} usage={usage} />
    </SafeAreaProvider>,
  );
  return { onDone, onJustStart, onOpenPrivacy, usage };
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

  describe('usage notice', () => {
    it('says that usage stats include article titles', async () => {
      await renderScreen();

      expect(screen.getByText(/Anonymous usage stats, including article titles, help tune feeds\./)).toBeOnTheScreen();
    });

    it('turns usage stats off in place', async () => {
      const { usage } = await renderScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Turn off usage stats' }));

      expect(usage.setSharing).toHaveBeenCalledWith(false);
    });

    it('offers to turn usage stats back on once they are off', async () => {
      const { usage } = await renderScreen({ sharing: false });

      await fireEvent.press(screen.getByRole('button', { name: 'Turn on usage stats' }));

      expect(screen.getByText(/Usage stats are off\./)).toBeOnTheScreen();
      expect(usage.setSharing).toHaveBeenCalledWith(true);
    });

    it('opens the privacy section', async () => {
      const { onOpenPrivacy } = await renderScreen();

      await fireEvent.press(screen.getByRole('link', { name: 'Privacy' }));

      expect(onOpenPrivacy).toHaveBeenCalled();
    });

    it('says nothing until the saved choice has loaded, so an opted-out visitor never sees the sharing line', async () => {
      await renderScreen({ sharing: undefined });

      expect(screen.queryByText(/Anonymous usage stats/)).toBeNull();
    });

    it('offers no switch until the saved choice has loaded', async () => {
      await renderScreen({ sharing: undefined });

      expect(screen.queryByRole('button', { name: 'Turn off usage stats' })).toBeNull();
    });
  });
});
