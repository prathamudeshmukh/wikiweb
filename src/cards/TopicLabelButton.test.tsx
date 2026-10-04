import { render, screen, waitFor } from '@testing-library/react-native';
import { Gesture, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { TopicLabelButton } from './TopicLabelButton';

describe('TopicLabelButton', () => {
  it('shows the topic like the plain label', async () => {
    await render(<TopicLabelButton label="Philosophy" color="#6B3B66" onPress={jest.fn()} blocks={Gesture.Tap()} enabled />);

    expect(screen.getByText('● PHILOSOPHY')).toBeOnTheScreen();
  });

  it('opens the tree when tapped', async () => {
    const onPress = jest.fn();
    await render(<TopicLabelButton label="Philosophy" color="#6B3B66" onPress={onPress} blocks={Gesture.Tap()} enabled />);

    fireGestureHandler(getByGestureTestId('topic-label'), [{ state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END }]);

    await waitFor(() => expect(onPress).toHaveBeenCalled());
  });
});
