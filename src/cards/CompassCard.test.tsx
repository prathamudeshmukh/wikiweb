import { act, render, screen } from '@testing-library/react-native';
import { CompassCard, QUOTE_DELAY_MS } from './CompassCard';

const QUOTE = 'A year on Mercury lasts 88 Earth days.';
const COSMOS = { tileId: 'space', territory: 'cosmos' } as const;

const renderCard = (quote: string | null) => render(<CompassCard width={358} height={600} quote={quote} topic={COSMOS} />);

describe('CompassCard', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('only sets a course while the load may still be quick', async () => {
    await renderCard(QUOTE);

    expect(screen.getByLabelText('Setting a course')).toBeOnTheScreen();
    expect(screen.queryByText(QUOTE)).toBeNull();
  });

  it('shares the seed’s quote once the load is clearly slow', async () => {
    await renderCard(QUOTE);

    await act(() => jest.advanceTimersByTime(QUOTE_DELAY_MS));

    expect(screen.getByText(QUOTE)).toBeOnTheScreen();
    expect(screen.getByText('WHILE YOU TRAVEL')).toBeOnTheScreen();
    expect(screen.getByLabelText(`Setting a course. While you travel: ${QUOTE}`)).toBeOnTheScreen();
  });

  it('stays a plain compass when there is nothing to quote', async () => {
    await renderCard(null);

    await act(() => jest.advanceTimersByTime(QUOTE_DELAY_MS));

    expect(screen.queryByText('WHILE YOU TRAVEL')).toBeNull();
  });
});
