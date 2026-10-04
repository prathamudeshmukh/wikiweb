import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EditInterestsScreen } from './EditInterestsScreen';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const SAVED = ['space', 'history', 'art'];

async function renderScreen(props: { saved?: readonly string[]; initialTree?: { tileId: string; subfieldId?: string } } = {}) {
  const onSave = jest.fn();
  const onBack = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <EditInterestsScreen saved={props.saved ?? SAVED} onSave={onSave} onBack={onBack} initialTree={props.initialTree} />
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

  it('tells screen readers why Save is off', async () => {
    await renderScreen();

    expect(screen.getByRole('button', { name: 'Save' })).toHaveProp('accessibilityHint', 'Change your picks to save');
  });
});

describe('EditInterestsScreen interest trees (SPEC.md §3.9)', () => {
  const openTree = (name: string) => fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
  const back = () => fireEvent.press(screen.getByRole('button', { name: 'Back' }));

  it('opens a tile that has a tree instead of toggling it', async () => {
    await renderScreen();

    await openTree('Philosophy');

    expect(screen.getByRole('checkbox', { name: 'All of Philosophy' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Logic & reasoning/ })).toBeTruthy();
  });

  it('narrows a tile to a subfield and saves it as a path id', async () => {
    const { onSave, save } = await renderScreen();
    await openTree('Philosophy');

    await fireEvent.press(screen.getByRole('checkbox', { name: /^Logic & reasoning/ }));
    await back();
    await save();

    expect(onSave).toHaveBeenCalledWith(['space', 'history', 'art', 'philosophy/logic']);
  });

  it('shows a narrowed tile with its number of picks on the grid', async () => {
    await renderScreen({ saved: ['space', 'art', 'philosophy/logic', 'philosophy/ethics/stoicism'] });

    expect(screen.getByRole('button', { name: 'Philosophy, narrowed to 2 picks' })).toBeTruthy();
  });

  it('replaces a picked subfield with the leaf tapped inside it', async () => {
    const { onSave, save } = await renderScreen({ saved: ['space', 'art', 'philosophy/logic'] });
    await openTree('Philosophy');

    await fireEvent.press(screen.getByRole('checkbox', { name: /^Paradoxes/ }));
    await back();
    await save();

    expect(onSave).toHaveBeenCalledWith(['space', 'art', 'philosophy/logic/paradoxes']);
  });

  it('makes the tile broad again from the All row', async () => {
    const { onSave, save } = await renderScreen({ saved: ['space', 'art', 'philosophy/logic'] });
    await openTree('Philosophy');

    await fireEvent.press(screen.getByRole('checkbox', { name: 'All of Philosophy' }));
    await back();
    await save();

    expect(onSave).toHaveBeenCalledWith(['space', 'art', 'philosophy']);
  });

  it('opens straight into a tree when asked to', async () => {
    await renderScreen({ initialTree: { tileId: 'maths' } });

    expect(screen.getByRole('checkbox', { name: 'All of Maths' })).toBeTruthy();
  });

  it('counts tiles touched for the minimum', async () => {
    const { onSave, save } = await renderScreen({ saved: ['space', 'art', 'music'] });
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Music' }));
    await openTree('Philosophy');

    await fireEvent.press(screen.getByRole('checkbox', { name: /^Ethics/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /^Logic & reasoning/ }));
    await back();
    await save();

    expect(onSave).toHaveBeenCalledWith(['space', 'art', 'philosophy/ethics', 'philosophy/logic']);
  });
});
