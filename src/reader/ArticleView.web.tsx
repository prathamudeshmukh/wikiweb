import { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { ArticleViewProps } from './articleViewTypes';
import { buildFrameDocument, frameMessageHandler, scrollMessage } from './frameBridge';

// No allow-same-origin: the article gets an opaque origin and can't reach the app's storage or DOM (SPEC.md §15.4).
const FRAME_SANDBOX = 'allow-scripts';

/** The article in a sandboxed iframe; link taps arrive as `message` events from it. */
export function ArticleView({ ref, html, background, onLink }: ArticleViewProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => buildFrameDocument(html), [html]);
  // The frame's origin is opaque, so a scroll request can only be addressed to '*'; it carries no data of the app's.
  useImperativeHandle(ref, () => ({ scrollTo: (id) => frame.current?.contentWindow?.postMessage(scrollMessage(id), '*') }), []);

  useEffect(() => {
    const onMessage = frameMessageHandler(() => frame.current?.contentWindow ?? null, onLink);
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onLink]);

  return (
    <iframe
      ref={frame}
      srcDoc={srcDoc}
      sandbox={FRAME_SANDBOX}
      title="Article"
      data-testid="reader-webview"
      style={{ flex: 1, width: '100%', border: 0, display: 'block', backgroundColor: background }}
    />
  );
}
