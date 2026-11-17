import { pointerKind } from './pointerKind';

const matching = (matchingQuery: string) => (query: string) => ({ matches: query === matchingQuery });

describe('pointerKind', () => {
  it('is coarse on a touch screen', () => {
    expect(pointerKind(matching('(pointer: coarse)'))).toBe('coarse');
  });

  it('is fine with a mouse or trackpad', () => {
    expect(pointerKind(matching('(pointer: fine)'))).toBe('fine');
  });

  it('is none when the device has no pointer', () => {
    expect(pointerKind(matching('(pointer: none)'))).toBe('none');
  });

  it('is unknown when the browser cannot answer media queries', () => {
    expect(pointerKind(undefined)).toBe('unknown');
  });

  it('is unknown when the media query throws', () => {
    const throwing = () => {
      throw new Error('not supported');
    };

    expect(pointerKind(throwing)).toBe('unknown');
  });
});
