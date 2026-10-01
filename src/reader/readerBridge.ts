import { z } from 'zod';

/**
 * Wikipedia's page script (PCS) handles link taps itself and cancels them, so the WebView never sees a
 * navigation. This listener runs first (capture phase, injected before PCS loads) and forwards every link
 * tap to the app, which decides what it means (SPEC.md §3.4). Taps elsewhere (collapsing tables) are untouched.
 */
export const LINK_CAPTURE_SCRIPT = `(function () {
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'link', href: link.href }));
  }, true);
})();
true;`;

const linkMessage = z.object({ type: z.literal('link'), href: z.string().min(1) });

/** The tapped link from a page message, or null for anything else. Page content is untrusted, so validate. */
export function parseReaderMessage(data: string): { href: string } | null {
  try {
    const parsed = linkMessage.safeParse(JSON.parse(data));
    return parsed.success ? { href: parsed.data.href } : null;
  } catch {
    return null;
  }
}

/** Script that scrolls the page to a link's fragment (footnotes, sections), or null if it has none. */
export function scrollToAnchorScript(url: string): string | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  let id: string;
  try {
    id = decodeURIComponent(url.slice(hashIndex + 1));
  } catch {
    return null;
  }
  if (!id) return null;
  // JSON.stringify yields a safely quoted JS string literal, whatever the fragment contains.
  return `(function () { var el = document.getElementById(${JSON.stringify(id)}); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); })(); true;`;
}
