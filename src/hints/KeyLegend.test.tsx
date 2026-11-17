import { render, screen } from '@testing-library/react-native';
import { KeyLegend, KeyLegendView } from './KeyLegend';
import { usePointerKind } from './usePointerKind';

jest.mock('expo-router', () => ({ usePathname: jest.fn(() => '/') }));
jest.mock('./usePointerKind', () => ({ usePointerKind: jest.fn(() => 'fine') }));

describe('KeyLegendView', () => {
  it('names each key with what it does', async () => {
    await render(<KeyLegendView left={992} />);

    expect(screen.getByText('TAKE A TANGENT')).toBeTruthy();
    expect(screen.getByText('BACK')).toBeTruthy();
    expect(screen.getByText('READ')).toBeTruthy();
  });
});

describe('KeyLegend', () => {
  it('stays hidden when the app fills the screen, as it always does on a phone', async () => {
    await render(<KeyLegend />);

    expect(screen.queryByTestId('key-legend')).toBeNull();
  });

  it('stays hidden on a touch screen', async () => {
    jest.mocked(usePointerKind).mockReturnValueOnce('coarse');

    await render(<KeyLegend />);

    expect(screen.queryByTestId('key-legend')).toBeNull();
  });
});
