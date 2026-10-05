import { fireEvent, render, screen } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { NudgeCard } from './NudgeCard';
import { chipChoices, type Nudge } from './nudgeRules';

const PROMPT: Nudge = { kind: 'prompt', tileId: 'philosophy', reads: 3 };
const EXHAUSTED: Nudge = { kind: 'exhausted', node: { path: 'philosophy/ethics/stoicism', articleCount: 37 } };

async function renderNudge(nudge: Nudge, picked: readonly string[] = []) {
  const handlers = { onChip: jest.fn(), onOpenTree: jest.fn(), onDismiss: jest.fn() };
  const chips = chipChoices(nudge, ['philosophy/ethics/stoicism']);
  await render(
    <NudgeCard nudge={nudge} chips={chips} pickedChips={new Set(picked)} width={358} height={600} enabled columnPan={Gesture.Pan()} {...handlers} />,
  );
  return { ...handlers, chips };
}

describe('NudgeCard', () => {
  it('asks to narrow the tile and offers its subfields', async () => {
    await renderNudge(PROMPT);

    expect(screen.getByText('Narrow Philosophy?')).toBeTruthy();
    expect(screen.getByText('+ ETHICS')).toBeTruthy();
  });

  it('adds a subfield from its chip', async () => {
    const { onChip, chips } = await renderNudge(PROMPT);

    await fireEvent.press(screen.getByText('+ ETHICS'));

    expect(onChip).toHaveBeenCalledWith(chips[0]);
  });

  it('shows tapped chips as picked, with a check icon rather than a text glyph', async () => {
    await renderNudge(PROMPT, ['philosophy/ethics']);

    expect(screen.getByText('ETHICS')).toBeTruthy();
    expect(screen.getAllByTestId('chip-check', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('opens the tree from the card body', async () => {
    const { onOpenTree } = await renderNudge(PROMPT);

    await fireEvent.press(screen.getByText('Narrow Philosophy?'));

    expect(onOpenTree).toHaveBeenCalled();
  });

  it('celebrates an exhausted node with its count and offers neighbours', async () => {
    await renderNudge(EXHAUSTED);

    expect(screen.getByText("You've read all of Stoicism")).toBeTruthy();
    expect(screen.getByText('37/37', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('+ EPICUREANISM')).toBeTruthy();
    expect(screen.queryByText('+ STOICISM')).toBeNull();
  });

  it('lets screen readers add a chip, open the tree or skip', async () => {
    const { onChip, onDismiss, chips } = await renderNudge(PROMPT);
    const card = screen.getByLabelText(/^Narrow Philosophy\?/);

    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: chips[1].path } });
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'skip' } });

    expect(onChip).toHaveBeenCalledWith(chips[1]);
    expect(onDismiss).toHaveBeenCalled();
  });
});
