import { render, screen } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import type { FeedbackAnswer } from '../feedback/useFeedbackAnswer';
import { HomeNudgeSlot } from './HomeNudgeSlot';
import type { Nudge } from './nudgeRules';
import type { HomeNudgeView } from './useHomeNudge';

const FEEDBACK_ANSWER: FeedbackAnswer = { rating: null, rate: jest.fn(), send: jest.fn(), close: jest.fn(), email: jest.fn(async () => undefined) };

function viewOf(nudge: Nudge | null): HomeNudgeView {
  return {
    nudge,
    index: nudge ? 3 : null,
    chips: [],
    pickedChips: new Set(),
    toast: null,
    onChip: jest.fn(),
    onOpenTree: jest.fn(),
    onDismiss: jest.fn(),
    onAnswered: jest.fn(),
    onVisible: jest.fn(),
  };
}

async function renderSlot(nudge: Nudge | null) {
  await render(<HomeNudgeSlot nudge={viewOf(nudge)} feedback={FEEDBACK_ANSWER} width={358} height={600} enabled columnPan={Gesture.Pan()} />);
}

describe('HomeNudgeSlot', () => {
  it('holds the feedback card when feedback is due', async () => {
    await renderSlot({ kind: 'feedback', expeditions: 2, channel: 'analytics' });

    expect(screen.getByTestId('nudge-feedback')).toBeTruthy();
  });

  it('holds a niche card otherwise', async () => {
    await renderSlot({ kind: 'prompt', tileId: 'philosophy', reads: 3 });

    expect(screen.getByTestId('nudge-prompt')).toBeTruthy();
  });

  it('is empty with nothing due', async () => {
    await renderSlot(null);

    expect(screen.toJSON()).toBeNull();
  });
});
