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
