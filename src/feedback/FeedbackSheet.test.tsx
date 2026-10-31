import { fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FEEDBACK } from '../config/constants';
import type { FeedbackRating } from '../analytics/events';
import { FeedbackSheet } from './FeedbackSheet';

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderSheet(rating: FeedbackRating) {
  const handlers = { onSend: jest.fn(), onClose: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <FeedbackSheet rating={rating} {...handlers} />
    </SafeAreaProvider>,
  );
  return handlers;
}

describe('FeedbackSheet', () => {
  it('asks what would make it better after a thumbs down', async () => {
    await renderSheet('down');

    expect(screen.getByText('What would make it better?', { includeHiddenElements: true })).toBeTruthy();
  });

  it('asks what the user likes after a thumbs up', async () => {
    await renderSheet('up');

    expect(screen.getByPlaceholderText('What do you like most?')).toBeTruthy();
  });

  it('sends what was typed', async () => {
    const { onSend } = await renderSheet('down');

    await fireEvent.changeText(screen.getByLabelText('Your note'), 'Cards repeat');
    await fireEvent.press(screen.getByText('SEND'));

    expect(onSend).toHaveBeenCalledWith('Cards repeat');
  });

  it('will not send an empty note', async () => {
    const { onSend } = await renderSheet('up');

    await fireEvent.press(screen.getByText('SEND'));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('closes on skip, sending nothing', async () => {
    const { onSend, onClose } = await renderSheet('up');

    await fireEvent.press(screen.getByText('SKIP'));

    expect(onClose).toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('caps the note and says so', async () => {
    await renderSheet('up');

    expect(screen.getByLabelText('Your note').props.maxLength).toBe(FEEDBACK.noteMaxLength);
    expect(screen.getByText(`0/${FEEDBACK.noteMaxLength}`)).toBeTruthy();
  });

  it('closes on Android back rather than leaving the app', async () => {
    const listen = jest.spyOn(BackHandler, 'addEventListener');
    const { onClose } = await renderSheet('up');
    const [, onBack] = listen.mock.calls.find(([event]) => event === 'hardwareBackPress') ?? [];

    const handled = onBack?.({ type: 'hardwareBackPress', timeStamp: 0 });

    expect(handled).toBe(true);
    expect(onClose).toHaveBeenCalled();
    listen.mockRestore();
  });
});
