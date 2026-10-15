import { z } from 'zod';

/**
 * Wikipedia's page script (PCS) handles link taps itself and cancels them, so the page never navigates. This listener
 * runs first (capture phase, injected before PCS loads) and forwards every link tap to the app through `post`, a JS
 * function expression taking the message string. The app decides what the tap means (SPEC.md §3.4). Taps elsewhere
 * (collapsing tables) are untouched.
 */
export function linkCaptureScript(post: string): string {
  return `document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    (${post})(JSON.stringify({ type: 'link', href: link.href }));
  }, true);`;
}

/** The native WebView's bridge (the trailing `true` is what injected scripts must evaluate to on iOS). */
export const LINK_CAPTURE_SCRIPT = `(function () {
  ${linkCaptureScript('function (message) { window.ReactNativeWebView.postMessage(message); }')}
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

/** The element id a link's fragment points at (footnotes, sections), or null if it has none. */
export function anchorId(url: string): string | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  try {
    return decodeURIComponent(url.slice(hashIndex + 1)) || null;
  } catch {
    return null;
  }
}

/**
 * Page-side JS that scrolls to an element. Footnotes live in the References section, which PCS keeps collapsed
 * (`display: none`) until its header is tapped, and nothing hidden can be scrolled to, so it opens the target's
 * collapsed sections first through PCS's own API.
 */
export const SCROLL_TO_ID_FUNCTION = `function (id) {
  var target = document.getElementById(id);
  if (!target) return;
  var sections = window.pcs && window.pcs.c1 && window.pcs.c1.Sections;
  for (var node = target.parentElement; node && sections; node = node.parentElement) {
    var section = /^pcs-section-content-(.+)$/.exec(node.id || '');
    if (section && node.classList.contains('pcs-section-hidden')) sections.setHidden(section[1], false);
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}`;

/** Script that scrolls the native WebView's page to an element. */
export function scrollToIdScript(id: string): string {
  // JSON.stringify yields a safely quoted JS string literal, whatever the id contains.
  return `(${SCROLL_TO_ID_FUNCTION})(${JSON.stringify(id)}); true;`;
}
