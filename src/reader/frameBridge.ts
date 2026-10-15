import { linkCaptureScript, parseReaderMessage, SCROLL_TO_ID_FUNCTION } from './readerBridge';

// The web reader is a sandboxed <iframe srcdoc> with an opaque origin (SPEC.md §15.4). Its bridge is the native one
// with `parent.postMessage` as the transport, plus scroll requests coming the other way.

/** Runs first in the frame's head: forwards link taps to the app and scrolls when the app asks. */
export const FRAME_BRIDGE_SCRIPT = `(function () {
  ${linkCaptureScript("function (message) { parent.postMessage(message, '*'); }")}
  window.addEventListener('message', function (event) {
    if (event.source !== parent || typeof event.data !== 'string') return;
    var request;
    try { request = JSON.parse(event.data); } catch (error) { return; }
    if (!request || request.type !== 'scrollTo' || typeof request.id !== 'string') return;
    (${SCROLL_TO_ID_FUNCTION})(request.id);
  });
})();`;

// mobile-html's base is protocol-relative, and so are PCS and every stylesheet. In a srcdoc frame that resolves
// against the app's own scheme, which is http in development.
const PROTOCOL_RELATIVE_BASE = /<base(\s[^>]*)?\shref="\/\//i;
// `\s|>` after the name, so a <header> is never taken for the head; the real tag has attributes (`<head prefix=…>`).
const HEAD_OPEN_TAG = /<head(\s[^>]*)?>/i;

/** The reader's document made ready for the frame: https links, and the bridge before any of the page's scripts. */
export function buildFrameDocument(readerHtml: string): string {
  const bridge = `<script>${FRAME_BRIDGE_SCRIPT}</script>`;
  const https = readerHtml.replace(PROTOCOL_RELATIVE_BASE, (tag) => tag.replace(/href="\/\/$/i, 'href="https://'));
  return HEAD_OPEN_TAG.test(https) ? https.replace(HEAD_OPEN_TAG, (tag) => `${tag}${bridge}`) : `${bridge}${https}`;
}

/** Asks the frame to scroll to an element (footnotes, sections). */
export function scrollMessage(id: string): string {
  return JSON.stringify({ type: 'scrollTo', id });
}

interface FrameMessage {
  source: unknown;
  data: unknown;
}

/**
 * Routes `message` events from the reader frame to `onLink`. Any page can post to the app's window, and the frame's
 * origin is opaque ("null"), so the frame is recognised by its window, and its content is validated as untrusted.
 */
export function frameMessageHandler(frame: () => unknown, onLink: (href: string) => void): (event: FrameMessage) => void {
  return ({ source, data }) => {
    if (source === null || source !== frame() || typeof data !== 'string') return;
    const message = parseReaderMessage(data);
    if (message) onLink(message.href);
  };
}
