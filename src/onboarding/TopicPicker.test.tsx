import { fireEvent, render, screen } from '@testing-library/react-native';
import { TOPIC_TILES } from '../config/topicTiles';
import { TopicPicker } from './TopicPicker';

async function renderPicker(selected: readonly string[]) {
  const onChange = jest.fn();
  await render(<TopicPicker selected={selected} onChange={onChange} />);
  return { onChange };
}

describe('TopicPicker', () => {
  it('offers every topic tile', async () => {
    await renderPicker([]);

    expect(screen.getAllByRole('checkbox')).toHaveLength(TOPIC_TILES.length);
  });

  it('checks the tiles it was given', async () => {
    await renderPicker(['space']);

    expect(screen.getByRole('checkbox', { name: 'Space' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'History' })).not.toBeChecked();
  });

  it('adds a tapped tile to the picks', async () => {
    const { onChange } = await renderPicker(['space']);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'History' }));

    expect(onChange).toHaveBeenCalledWith(['space', 'history']);
  });

  it('removes a picked tile when tapped again', async () => {
    const { onChange } = await renderPicker(['space', 'history']);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Space' }));

    expect(onChange).toHaveBeenCalledWith(['history']);
  });

  it('counts the picks against the minimum', async () => {
    await renderPicker(['space', 'history']);

    expect(screen.getByText(/PICK AT LEAST 3/)).toHaveTextContent('PICK AT LEAST 3 · 2 PICKED');
  });
});
