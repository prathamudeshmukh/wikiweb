import { buildUserAgent } from './constants';

describe('buildUserAgent', () => {
  it('identifies the app with the configured contact', () => {
    expect(buildUserAgent(' https://example.org/tangent ')).toBe('Tangent/0.1 (https://example.org/tangent)');
  });

  it('refuses to build a user agent without contact details', () => {
    expect(() => buildUserAgent('   ')).toThrow(/contact/);
  });
});
