import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsScreen } from './SettingsScreen';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderSettings() {
  const onBack = jest.fn();
  const onOpenInterests = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <SettingsScreen interests={['space', 'history', 'music', 'food']} onBack={onBack} onOpenInterests={onOpenInterests} />
    </SafeAreaProvider>,
  );
  return { onBack, onOpenInterests };
}

describe('SettingsScreen', () => {
  it('summarises the current interests', async () => {
    await renderSettings();

    expect(screen.getByText('Space, History, Music +1')).toBeOnTheScreen();
  });

  it('opens the interests picker', async () => {
    const { onOpenInterests } = await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: /Interests/ }));

    expect(onOpenInterests).toHaveBeenCalled();
  });

  it('goes back', async () => {
    const { onBack } = await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalled();
  });
});
