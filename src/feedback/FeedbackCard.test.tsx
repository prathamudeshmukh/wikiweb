import { fireEvent, render, screen } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { FeedbackCard } from './FeedbackCard';
import type { FeedbackNudge } from './feedbackPrompt';

const ASK: FeedbackNudge = { kind: 'feedback', expeditions: 2, channel: 'analytics' };
const ASK_BY_EMAIL: FeedbackNudge = { ...ASK, channel: 'email' };

async function renderCard(nudge: FeedbackNudge) {
  const handlers = { onRate: jest.fn(), onEmail: jest.fn(), onDismiss: jest.fn() };
  await render(<FeedbackCard nudge={nudge} width={358} height={600} enabled columnPan={Gesture.Pan()} {...handlers} />);
  return handlers;
}

describe('FeedbackCard', () => {
  it('asks whether the user is enjoying Tangent, with the expedition count', async () => {
    await renderCard(ASK);

    expect(screen.getByText('Enjoying Tangent?')).toBeTruthy();
    expect(screen.getByText('2 EXPEDITIONS')).toBeTruthy();
  });

  it('rates with a thumb', async () => {
    const { onRate } = await renderCard(ASK);

    await fireEvent.press(screen.getByText('👎 NOT YET'));

    expect(onRate).toHaveBeenCalledWith('down');
  });

  it('offers only email when usage sharing is off', async () => {
    const { onEmail } = await renderCard(ASK_BY_EMAIL);

    await fireEvent.press(screen.getByText('SEND FEEDBACK BY EMAIL →'));

    expect(onEmail).toHaveBeenCalled();
    expect(screen.queryByText('👍 YES')).toBeNull();
  });

  it('shows the address beside the email button, for when no mail app opens', async () => {
    await renderCard(ASK_BY_EMAIL);

    expect(screen.getByText('FEEDBACK@GOTANGENT.APP')).toBeTruthy();
  });

  it('lets screen readers rate or skip', async () => {
    const { onRate, onDismiss } = await renderCard(ASK);
    const card = screen.getByLabelText(/^Enjoying Tangent\?/);

    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'up' } });
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'skip' } });

    expect(onRate).toHaveBeenCalledWith('up');
    expect(onDismiss).toHaveBeenCalled();
  });
});
