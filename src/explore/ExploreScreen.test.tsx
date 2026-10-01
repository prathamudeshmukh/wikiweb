import { fireEvent, screen } from '@testing-library/react-native';
import { layOutColumns, renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi } from '../content/__testing__/fakeWikiApi';
import { ExploreScreen } from './ExploreScreen';

const FEATURED_SPACE = 'articletopic:space incategory:Featured_articles';
const titles = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

describe('ExploreScreen', () => {
  it('opens on Home with cards from the user’s interests', async () => {
    const { api } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) } });

    await renderWithServices(<ExploreScreen interests={['space']} onOpenArticle={jest.fn()} incomingTangent={null} onTangentStarted={jest.fn()} />, api);
    await layOutColumns();

    expect(await screen.findByText('Space 1')).toBeOnTheScreen();
    expect(screen.getByText('tangent')).toBeOnTheScreen();
    expect(screen.getAllByText('★ YOU LIKE SPACE').length).toBeGreaterThan(0);
  });

  it('shows a retry card when Home fails to load, and recovers', async () => {
    const { api, state } = fakeWikiApi({ searches: { [FEATURED_SPACE]: titles('Space', 30) } });
    state.failNextHydrate = true;

    await renderWithServices(<ExploreScreen interests={['space']} onOpenArticle={jest.fn()} incomingTangent={null} onTangentStarted={jest.fn()} />, api);
    await layOutColumns();
    await fireEvent.press(await screen.findByRole('button', { name: 'Couldn’t load. Tap to retry.' }));

    expect(await screen.findByText('Space 1')).toBeOnTheScreen();
  });
});
