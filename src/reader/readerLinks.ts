import { isArticleTitle, pathToTitle } from '../wiki-api/linkExtraction';

export type ReaderLink =
  /** The reader's own page loading — let it through. */
  | { kind: 'document' }
  /** Another article: show the peek card instead of navigating. */
  | { kind: 'article'; title: string }
  /** A jump within the current article (footnote, section). */
  | { kind: 'anchor' }
  /** Another website: open in the browser. */
  | { kind: 'external'; url: string }
  /** Files, edit links, other namespaces, non-web schemes. */
  | { kind: 'ignore' };

const WIKIPEDIA_HOST = 'en.wikipedia.org';
// mobile-html links are relative (`./Ink`), so they resolve under the page's base URL.
const ARTICLE_PATH_PREFIXES = ['/api/rest_v1/page/mobile-html/', '/wiki/'];

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function classifyWikipedia(parsed: URL, currentTitle: string | undefined): ReaderLink {
  const prefix = ARTICLE_PATH_PREFIXES.find((p) => parsed.pathname.startsWith(p));
  if (!prefix) return { kind: 'ignore' };
  const segment = parsed.pathname.slice(prefix.length);
  if (!segment) return { kind: 'document' };
  const title = pathToTitle(segment);
  if (!title || !isArticleTitle(title)) return { kind: 'ignore' };
  if (parsed.hash && title === currentTitle) return { kind: 'anchor' };
  return { kind: 'article', title };
}

/** Decides what a tap on a link inside the reader should do (SPEC.md §3.4). */
export function classifyReaderLink(url: string, currentTitle?: string): ReaderLink {
  const parsed = parseUrl(url);
  if (!parsed) return { kind: 'ignore' };
  if (parsed.protocol === 'about:') return parsed.hash ? { kind: 'anchor' } : { kind: 'document' };
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { kind: 'ignore' };
  if (parsed.host === WIKIPEDIA_HOST) return classifyWikipedia(parsed, currentTitle);
  return { kind: 'external', url };
}
