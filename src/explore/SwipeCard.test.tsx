import { fireEvent, render, screen } from '@testing-library/react-native';
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

async function renderCard(c: Card, onOpenTopic = jest.fn()) {
  await render(
    <SwipeCard card={c} seedTitle={null} width={358} height={600} enabled candidate={false} hop={hop} onOpen={jest.fn()} hint={null} peelToken={null} onOpenTopic={onOpenTopic} />,
  );
  return { onOpenTopic };
}

describe('SwipeCard topic label (SPEC.md §3.9)', () => {
  it("lets screen readers open the tree of a card's tile", async () => {
    const { onOpenTopic } = await renderCard(card('philosophy', 'mind'));

    await fireEvent(screen.getByHintText('Opens the article'), 'accessibilityAction', { nativeEvent: { actionName: 'topicTree' } });

    expect(onOpenTopic).toHaveBeenCalledWith('philosophy');
  });

  it('names the action after the topic', async () => {
    await renderCard(card('philosophy', 'mind'));

    expect(screen.getByHintText('Opens the article')).toHaveProp('accessibilityActions', [{ name: 'topicTree', label: 'Philosophy interests' }]);
  });

  it('offers no tree for a tile without one', async () => {
    await renderCard(card('music', 'culture'));

    expect(screen.getByHintText('Opens the article').props.accessibilityActions).toBeUndefined();
  });
});
