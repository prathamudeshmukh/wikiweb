import { hintCopy } from './hintCopy';

describe('hintCopy', () => {
  it('teaches the swipe on a touch screen', () => {
    expect(hintCopy('swipe', 'coarse')).toBe('← SWIPE LEFT TO TAKE A TANGENT');
  });

  it('teaches drag or the right arrow with a mouse or trackpad', () => {
    expect(hintCopy('swipe', 'fine')).toBe('DRAG OR PRESS → TO TAKE A TANGENT');
  });

  it('teaches drag or the left arrow for going back with a mouse or trackpad', () => {
    expect(hintCopy('back', 'fine')).toBe('DRAG OR PRESS ← TO GO BACK');
  });

  it('keeps the touch copy when the pointer is unknown', () => {
    expect(hintCopy('back', 'unknown')).toBe('SWIPE RIGHT TO GO BACK →');
  });
});
