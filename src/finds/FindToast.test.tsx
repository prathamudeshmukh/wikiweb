import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, idOf } from '../content/__testing__/fakeWikiApi';
import { FIND } from '../config/constants';
import { FindToast } from './FindToast';
import type { FindPage } from './findTypes';

const octopus: FindPage = { pageId: idOf('Octopus'), title: 'Octopus', tileId: 'animals', territory: 'life', thumbnailUrl: null };

async function renderToast(active = true) {
  const { services } = await renderWithServices(<FindToast active={active} />, fakeWikiApi({}).api);
  return services.finds;
}

describe('FindToast', () => {
  afterEach(() => jest.useRealTimers());

  it('confirms a kept find, then goes', async () => {
    jest.useFakeTimers();
    const finds = await renderToast();

    await act(() => finds.toggle(octopus, 'card'));
    expect(screen.getByText('KEPT IN FINDS')).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(FIND.keptToastMs));

    expect(screen.queryByText('KEPT IN FINDS')).toBeNull();
  });

  it('offers to undo a removal', async () => {
    const finds = await renderToast();
    await act(() => finds.toggle(octopus, 'card'));
    await act(() => finds.toggle(octopus, 'card'));
    expect(screen.getByText('FIND REMOVED')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    expect(finds.getState().ids.has(octopus.pageId)).toBe(true);
    expect(screen.queryByText('FIND REMOVED')).toBeNull();
  });

  it('stays hidden on a screen that isn’t on top', async () => {
    const finds = await renderToast(false);

    await act(() => finds.toggle(octopus, 'card'));

    expect(screen.queryByText('KEPT IN FINDS')).toBeNull();
  });
});
