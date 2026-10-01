import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PageRef } from '../wiki-api/types';
import { Breadcrumb } from './Breadcrumb';

const ref = (title: string, pageId: number): PageRef => ({ title, pageId });
const deepPath = [ref('Octopus', 1), ref('Ink', 2), ref('Iron gall ink', 3), ref('Leonardo da Vinci', 4)];

describe('Breadcrumb', () => {
  it('shows every crumb on a short route', async () => {
    await render(<Breadcrumb path={[ref('Octopus', 1), ref('Ink', 2)]} onJump={jest.fn()} entry={null} />);

    expect(['HOME', 'OCTOPUS', 'INK'].every((label) => screen.queryByText(label))).toBe(true);
  });

  it('collapses the middle of a long route', async () => {
    await render(<Breadcrumb path={deepPath} onJump={jest.fn()} entry={null} />);

    expect(screen.getByText('…')).toBeOnTheScreen();
    expect(screen.queryByText('INK')).toBeNull();
    expect(screen.getByText('LEONARDO DA VINCI')).toBeOnTheScreen();
  });

  it('jumps to the column of a tapped crumb', async () => {
    const onJump = jest.fn();
    await render(<Breadcrumb path={deepPath} onJump={onJump} entry={null} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back to IRON GALL INK' }));

    expect(onJump).toHaveBeenCalledWith(3);
  });

  it('does not jump from the current crumb or the collapsed marker', async () => {
    const onJump = jest.fn();
    await render(<Breadcrumb path={deepPath} onJump={onJump} entry={null} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Current: LEONARDO DA VINCI' }));
    await fireEvent.press(screen.getByText('…'));

    expect(onJump).not.toHaveBeenCalled();
  });
});
