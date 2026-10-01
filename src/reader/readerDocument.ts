import type { Palette } from '../theme/tokens';

interface ReaderDocumentInput {
  /** Wikipedia's mobile-html for the article. */
  html: string;
  title: string;
  palette: Palette;
  /** @font-face rules for the reader's fonts (embedded, so the reader never calls a font CDN). */
  fontFaceCss: string;
}

// DESIGN.md §6.4: Literata body at a comfortable measure, Fraunces headings, framed images, no edit chrome.
function readerCss(palette: Palette, fontFaceCss: string): string {
  const scheme = palette.cardShadow ? 'light' : 'dark';
  return `${fontFaceCss}
:root { color-scheme: ${scheme}; }
/* Wikipedia's mobile CSS takes its colours from these variables (often with !important), so theming them
   re-colours hatnotes, infoboxes and the rest in one place. */
:root, #pcs {
  --background-color-base: ${palette.paper};
  --background-color-interactive-subtle: ${palette.card};
  --background-color-neutral-subtle: ${palette.card};
  --color-base: ${palette.ink};
  --color-emphasized: ${palette.ink};
  --color-subtle: ${palette.muted};
  --color-progressive: ${palette.ink};
  --border-color-base: ${palette.line};
  --border-color-subtle: ${palette.line};
}
html, body { background: ${palette.paper} !important; color: ${palette.ink} !important; }
body { font-family: 'Literata', Georgia, serif; font-size: 17px; line-height: 1.6; max-width: 68ch; margin: 0 auto !important; padding: 8px 20px 48px !important; }
h1, h2, h3, h4, .pcs-edit-section-title { font-family: 'Fraunces', Georgia, serif; font-weight: 600; color: ${palette.ink} !important; border-color: ${palette.line} !important; }
a, a:visited { color: ${palette.ink} !important; text-decoration: underline dotted; text-decoration-color: ${palette.muted}; text-underline-offset: 3px; }
sup.reference a { text-decoration: none; color: ${palette.muted} !important; }
.pcs-edit-section-link-container, .pcs-edit-section-link, .mw-editsection { display: none !important; }
img { border-radius: 14px; }
figure, .thumb, .pcs-widen-image-wrapper { border-color: ${palette.line} !important; }
figcaption, .thumbcaption { color: ${palette.muted} !important; }
table, .infobox, .pcs-collapse-table-container, .navbox { background: ${palette.card} !important; color: ${palette.ink} !important; border-color: ${palette.line} !important; }
th, td { border-color: ${palette.line} !important; }
.infobox th, .infobox-above, .infobox-header, .infobox-title, .infobox caption { background: ${palette.paper} !important; color: ${palette.ink} !important; }
/* PCS styles hatnotes via an id selector (#pcs .hatnote) with !important; match its specificity and win on order. */
html body #pcs div.hatnote, html body div.hatnote { background: transparent !important; color: ${palette.muted} !important; font-style: italic; }
.tangent-attribution { margin-top: 40px; padding-top: 16px; border-top: 1px solid ${palette.line}; font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.08em; color: ${palette.muted}; }
.tangent-attribution a { color: ${palette.muted} !important; }`;
}

function attribution(title: string): string {
  const source = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  return `<footer class="tangent-attribution">FROM WIKIPEDIA · CC BY-SA 4.0 · <a href="${source}">VIEW ON WIKIPEDIA</a></footer>`;
}

/** Inserts `content` before the last `closingTag`; if the tag is missing, puts it at the start or end instead. */
interface Insertion {
  closingTag: string;
  content: string;
  fallback: 'start' | 'end';
}

function insertBefore(html: string, { closingTag, content, fallback }: Insertion): string {
  const index = html.toLowerCase().lastIndexOf(closingTag);
  if (index === -1) return fallback === 'start' ? `${content}${html}` : `${html}${content}`;
  return `${html.slice(0, index)}${content}${html.slice(index)}`;
}

/** Wikipedia's article HTML with Tangent's styling and the CC BY-SA attribution the licence requires. */
export function buildReaderDocument({ html, title, palette, fontFaceCss }: ReaderDocumentInput): string {
  const style = `<style id="tangent-reader">${readerCss(palette, fontFaceCss)}</style>`;
  const styled = insertBefore(html, { closingTag: '</head>', content: style, fallback: 'start' });
  return insertBefore(styled, { closingTag: '</body>', content: attribution(title), fallback: 'end' });
}
