import { NIGHT_ATLAS, PAPER } from '../theme/tokens';
import { buildReaderDocument } from './readerDocument';

const WIKI_HTML = '<!DOCTYPE html><html><head><title>Ink</title></head><body><section><p>Ink is a gel.</p></section></body></html>';

const build = (overrides = {}) =>
  buildReaderDocument({ html: WIKI_HTML, title: 'Ink', palette: PAPER, fontFaceCss: '@font-face{font-family:"Literata"}', ...overrides });

describe('buildReaderDocument', () => {
  it('keeps the article content', () => {
    expect(build()).toContain('<p>Ink is a gel.</p>');
  });

  it('adds the theme colours and fonts to the head', () => {
    const doc = build();

    expect(doc.indexOf('<style id="tangent-reader">')).toBeLessThan(doc.indexOf('</head>'));
    expect(doc).toContain(PAPER.paper);
    expect(doc).toContain('@font-face{font-family:"Literata"}');
  });

  it('uses Night atlas colours in dark mode', () => {
    expect(build({ palette: NIGHT_ATLAS })).toContain(NIGHT_ATLAS.ink);
  });

  it('themes Wikipedia’s own colour variables so its !important rules follow the palette', () => {
    const doc = build({ palette: NIGHT_ATLAS });

    expect(doc).toContain(`--background-color-base: ${NIGHT_ATLAS.paper}`);
    expect(doc).toContain(`--color-base: ${NIGHT_ATLAS.ink}`);
  });

  it('themes the neutral fill Wikipedia gives wikitable header cells', () => {
    expect(build({ palette: NIGHT_ATLAS })).toContain(`--background-color-neutral: ${NIGHT_ATLAS.line}`);
  });

  describe('Night atlas images and fills', () => {
    const night = () => build({ palette: NIGHT_ATLAS });

    it('inverts the images Wikipedia editors tagged for inverting', () => {
      expect(night()).toMatch(/#pcs \.skin-invert-image img[^{]*#pcs img\.skin-invert[^{]*\{[^}]*filter: invert\(1\) hue-rotate\(180deg\)/);
    });

    it('dims other images and leaves .notheme content un-inverted', () => {
      const doc = night();

      expect(doc).toMatch(/#pcs img \{[^}]*filter: brightness\(0\.85\)/);
      expect(doc.lastIndexOf('#pcs .notheme img')).toBeGreaterThan(doc.indexOf('#pcs .skin-invert-image img'));
    });

    it('runs the contrast pass for inline fills with Paper ink and Night ink', () => {
      const doc = night();

      expect(doc).toContain(JSON.stringify({ dark: PAPER.ink, light: NIGHT_ATLAS.ink }));
      expect(doc.indexOf('tangent-fill-contrast')).toBeLessThan(doc.indexOf('</body>'));
    });

    it('leaves Paper images and fills alone', () => {
      const doc = build();

      expect(doc).not.toContain('tangent-fill-contrast');
      expect(doc).not.toContain('filter:');
    });
  });

  it('hides edit controls', () => {
    expect(build()).toMatch(/\.pcs-edit-section-link-container[^{]*\{[^}]*display:\s*none/);
  });

  it('credits Wikipedia under CC BY-SA with a link to the source article', () => {
    const doc = build();

    expect(doc).toContain('CC BY-SA 4.0');
    expect(doc).toContain('href="https://en.wikipedia.org/wiki/Ink"');
    expect(doc.indexOf('CC BY-SA 4.0')).toBeLessThan(doc.indexOf('</body>'));
  });

  it('escapes the title in the attribution link', () => {
    expect(build({ title: 'AT&T "Bell"' })).toContain('href="https://en.wikipedia.org/wiki/AT%26T_%22Bell%22"');
  });

  it('still produces a document when the source has no head or body tags', () => {
    const doc = build({ html: '<p>Fragment</p>' });

    expect(doc).toContain('<p>Fragment</p>');
    expect(doc).toContain('tangent-reader');
    expect(doc).toContain('CC BY-SA 4.0');
  });
});
