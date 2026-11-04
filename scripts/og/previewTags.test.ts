import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PREVIEW_IMAGE_PATH } from './buildPreviewImage';

const SITE = 'https://gotangent.app';
const html = readFileSync(resolve('public/index.html'), 'utf8');

/** The content of `<meta property|name="key" content="…">`, or undefined when the tag is missing. */
function meta(key: string): string | undefined {
  const tag = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`));
  return tag?.[1];
}

describe('share preview tags in public/index.html', () => {
  it('names the canonical apex for the page and its image', () => {
    expect(meta('og:url')).toBe(`${SITE}/`);
    expect([meta('og:image'), meta('twitter:image')]).toEqual([`${SITE}/${PREVIEW_IMAGE_PATH}`, `${SITE}/${PREVIEW_IMAGE_PATH}`]);
    expect(html).toContain(`<link rel="canonical" href="${SITE}/" />`);
  });

  it('points og:image at a file that ships in public/', () => {
    expect(existsSync(resolve('public', PREVIEW_IMAGE_PATH))).toBe(true);
  });

  it('declares the image size so first shares render without a fetch', () => {
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(meta('twitter:card')).toBe('summary_large_image');
  });

  it('carries the agreed title and description for Open Graph and X alike', () => {
    expect(meta('og:title')).toBe('Tangent — Wikipedia, one swipe at a time');
    expect(meta('og:description')).toBe('Swipe left to follow a link, and see where you end up. No account, nothing to install.');
    expect([meta('twitter:title'), meta('twitter:description')]).toEqual([meta('og:title'), meta('og:description')]);
  });

  it('keeps the search description in step with the share copy', () => {
    expect(meta('description')).toBe(meta('og:description'));
  });

  it('describes the image for screen readers on both', () => {
    expect(meta('og:image:alt')).toBeTruthy();
    expect(meta('twitter:image:alt')).toBe(meta('og:image:alt'));
  });
});
