import { fireEvent, render, screen } from '@testing-library/react-native';
import { FeedStatusCard } from './FeedStatusCard';
import { SeedHeader } from './SeedHeader';

describe('FeedStatusCard', () => {
  it('offers a retry after an error', async () => {
    const onRetry = jest.fn();
    await render(<FeedStatusCard status="error" isHome={false} onRetry={onRetry} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Couldn’t load. Tap to retry.' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('points back at a dead end in a column', async () => {
    await render(<FeedStatusCard status="done" isHome={false} onRetry={jest.fn()} />);

    expect(screen.getByText('DEAD END — SWIPE RIGHT TO GO BACK')).toBeOnTheScreen();
  });

  it('does not tell Home users to swipe back', async () => {
    await render(<FeedStatusCard status="done" isHome onRetry={jest.fn()} />);

    expect(screen.queryByText(/SWIPE RIGHT/)).toBeNull();
  });

  it('announces loading and shows nothing when idle', async () => {
    const { rerender } = await render(<FeedStatusCard status="loading" isHome onRetry={jest.fn()} />);
    expect(screen.getByLabelText('Loading more cards')).toBeOnTheScreen();

    await rerender(<FeedStatusCard status="idle" isHome onRetry={jest.fn()} />);

    expect(screen.queryByLabelText('Loading more cards')).toBeNull();
  });
});

describe('SeedHeader', () => {
  it('names the article the column explores from', async () => {
    await render(<SeedHeader title="Octopus" topic={{ tileId: 'animals', territory: 'life' }} thumbnailUrl={null} />);

    expect(screen.getByLabelText('Exploring from Octopus')).toBeOnTheScreen();
  });
});
