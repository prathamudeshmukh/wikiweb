import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { makeMutable } from 'react-native-reanimated';
import type { Card } from '../content/card';
import type { HopController } from './hopController';
import { SwipeCard } from './SwipeCard';

const hop: HopController = {
  progress: makeMutable(0),
  from: makeMutable({ x: 0, y: 0, width: 0, height: 0 }),
  tiltDeg: makeMutable(0),
  prepare: jest.fn(),
  committed: jest.fn(),
  landed: jest.fn(),
};

const card = (tileId: string, territory: Card['topic']['territory']): Card => ({
  pageId: 1,
  title: 'Ship of Theseus',
  description: 'Thought experiment',
  extract: 'A ship whose parts are all replaced.',
  thumbnail: null,
  topic: { tileId, territory },
  topicIsFallback: false,
  incomingLinks: null,
  source: 'home_interest',
  visited: false,
  read: false,
});

async function renderCard(c: Card, { onOpenTopic = jest.fn(), found = false } = {}) {
  const onToggleFind = jest.fn();
  await render(
    <SwipeCard
      card={c}
      seedTitle={null}
      width={358}
      height={600}
      enabled
      candidate={false}
      hop={hop}
      onOpen={jest.fn()}
      hint={null}
      peelToken={null}
      onOpenTopic={onOpenTopic}
      found={found}
      onToggleFind={onToggleFind}
    />,
  );
  return { onOpenTopic, onToggleFind };
}

const findAction = { name: 'find', label: 'Keep as a find' };

describe('SwipeCard topic label (SPEC.md §3.9)', () => {
  it("lets screen readers open the tree of a card's tile", async () => {
    const { onOpenTopic } = await renderCard(card('philosophy', 'mind'));

    await fireEvent(screen.getByHintText('Opens the article'), 'accessibilityAction', { nativeEvent: { actionName: 'topicTree' } });

    expect(onOpenTopic).toHaveBeenCalledWith('philosophy');
  });

  it('names the action after the topic', async () => {
    await renderCard(card('philosophy', 'mind'));

    expect(screen.getByHintText('Opens the article')).toHaveProp('accessibilityActions', [{ name: 'topicTree', label: 'Philosophy interests' }, findAction]);
  });

  it('offers no tree for a tile without one', async () => {
    await renderCard(card('music', 'culture'));

    expect(screen.getByHintText('Opens the article')).toHaveProp('accessibilityActions', [findAction]);
  });
});

describe('SwipeCard ✦ (SPEC.md §3.7)', () => {
  it('keeps the card when ✦ is tapped', async () => {
    const c = card('music', 'culture');
    const { onToggleFind } = await renderCard(c);

    fireGestureHandler(getByGestureTestId('card-find'), [{ state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END }]);

    await waitFor(() => expect(onToggleFind).toHaveBeenCalledWith(c));
  });

  it('shows a kept card with a solid ✦ and says so to screen readers', async () => {
    await renderCard(card('music', 'culture'), { found: true });

    expect(screen.getByTestId('find-star-solid', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByLabelText(/Kept as a find/)).toBeOnTheScreen();
  });

  it('lets screen readers remove a find', async () => {
    const c = card('music', 'culture');
    const { onToggleFind } = await renderCard(c, { found: true });

    await fireEvent(screen.getByHintText('Opens the article'), 'accessibilityAction', { nativeEvent: { actionName: 'find' } });

    expect(onToggleFind).toHaveBeenCalledWith(c);
    expect(screen.getByHintText('Opens the article')).toHaveProp('accessibilityActions', [{ name: 'find', label: 'Remove find' }]);
  });
});
