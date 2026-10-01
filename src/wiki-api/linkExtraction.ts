// Pulls article links, in reading order, out of MediaWiki's parsed section HTML.
// MediaWiki output is machine-generated and regular, so targeted scanning is enough — no DOM needed.

interface StrippedElement {
  tag: string;
  /** Only strip elements whose class attribute matches; omit to strip every element of this tag. */
  classPattern?: RegExp;
}

// Containers whose links are not part of the article's prose: infoboxes/navboxes (tables), citation markers,
// the citation list, hatnotes ("For other uses, see…"), short descriptions and inline styles.
const STRIPPED: readonly StrippedElement[] = [
  { tag: 'style' },
  { tag: 'table' },
  { tag: 'sup', classPattern: /\breference\b/ },
  { tag: 'ol', classPattern: /\breferences\b/ },
  { tag: 'div', classPattern: /\b(hatnote|mw-references-wrap|shortdescription|navbox|reflist)\b/ },
];

const NON_ARTICLE_NAMESPACES = new Set([
  'File', 'Image', 'Media', 'Help', 'Wikipedia', 'WP', 'Category', 'Special', 'Template', 'Portal', 'Talk',
  'User', 'Module', 'Draft', 'MOS', 'Wiktionary', 'wikt', 'Wikt', 'Commons', 'Wikisource', 'Wikiquote', 'Book', 'TimedText',
]);

const ENTITIES: Readonly<Record<string, string>> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

function classOf(openTag: string): string {
  return /\bclass="([^"]*)"/.exec(openTag)?.[1] ?? '';
}

/** Index just past the close tag that matches the open tag at `start`, honouring nesting of the same tag. */
function endOfElement(html: string, tag: string, start: number): number {
  const tokens = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  tokens.lastIndex = start;
  let depth = 0;
  for (let match = tokens.exec(html); match; match = tokens.exec(html)) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return tokens.lastIndex;
  }
  return html.length;
}

function stripElements(html: string, { tag, classPattern }: StrippedElement): string {
  const opener = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  let result = '';
  let cursor = 0;
  for (let match = opener.exec(html); match; match = opener.exec(html)) {
    if (match.index < cursor) continue;
    if (classPattern && !classPattern.test(classOf(match[0]))) continue;
    result += html.slice(cursor, match.index);
    cursor = endOfElement(html, tag, match.index);
    opener.lastIndex = cursor;
  }
  return result + html.slice(cursor);
}

function decodeEntities(text: string): string {
  return text.replace(/&(amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity] ?? entity);
}

function hrefToTitle(href: string): string | null {
  const path = decodeEntities(href).split('#')[0];
  let title: string;
  try {
    title = decodeURIComponent(path).replace(/_/g, ' ');
  } catch {
    return null;
  }
  const colon = title.indexOf(':');
  if (colon > 0 && NON_ARTICLE_NAMESPACES.has(title.slice(0, colon))) return null;
  return title.trim() || null;
}

export function extractArticleLinks(html: string): string[] {
  const prose = STRIPPED.reduce(stripElements, html);
  const anchors = prose.matchAll(/<a\b[^>]*\bhref="\/wiki\/([^"]+)"[^>]*>/gi);
  const titles = [...anchors]
    .filter(([anchor]) => !/\bmw-disambig\b/.test(classOf(anchor)))
    .map(([, href]) => hrefToTitle(href))
    .filter((title): title is string => title !== null);
  return [...new Set(titles)];
}
