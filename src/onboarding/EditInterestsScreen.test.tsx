import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EditInterestsScreen } from './EditInterestsScreen';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const SAVED = ['space', 'history', 'art'];

async function renderScreen() {
  const onSave = jest.fn();
  const onBack = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <EditInterestsScreen saved={SAVED} onSave={onSave} onBack={onBack} />
    </SafeAreaProvider>,
  );
  const tap = (name: string) => fireEvent.press(screen.getByRole('checkbox', { name }));
  const save = () => fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  return { onSave, onBack, tap, save };
}

describe('EditInterestsScreen', () => {
  it('starts from the saved picks', async () => {
    await renderScreen();

    expect(screen.getByRole('checkbox', { name: 'Space' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Music' })).not.toBeChecked();
  });

  it('keeps Save disabled until the picks change', async () => {
    const { onSave, save } = await renderScreen();

    await save();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps Save disabled below three picks', async () => {
    const { onSave, tap, save } = await renderScreen();

    await tap('Art');
    await save();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the changed picks', async () => {
    const { onSave, tap, save } = await renderScreen();

    await tap('Art');
    await tap('Music');
    await save();

    expect(onSave).toHaveBeenCalledWith(['space', 'history', 'music']);
  });

  it('goes back without saving', async () => {
    const { onSave, onBack, tap } = await renderScreen();

    await tap('Music');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('has no way to skip', async () => {
    await renderScreen();

    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
  });
});
