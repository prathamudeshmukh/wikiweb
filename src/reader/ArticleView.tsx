import { useCallback, useImperativeHandle, useRef } from 'react';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { ArticleViewProps } from './articleViewTypes';
import { LINK_CAPTURE_SCRIPT, parseReaderMessage, scrollToIdScript } from './readerBridge';

// mobile-html uses relative links (./Ink) and protocol-relative scripts; this base resolves both.
const ARTICLE_BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/mobile-html/';

/** The article in a WebView; link taps arrive as messages (see readerBridge), navigations are only the document. */
export function ArticleView({ ref, html, background, onLink }: ArticleViewProps) {
  const webView = useRef<WebView>(null);
  useImperativeHandle(ref, () => ({ scrollTo: (id) => webView.current?.injectJavaScript(scrollToIdScript(id)) }), []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseReaderMessage(event.nativeEvent.data);
      if (message) onLink(message.href);
    },
    [onLink],
  );
  const onNavigate = useCallback((request: WebViewNavigation) => onLink(request.url), [onLink]);

  return (
    <WebView
      ref={webView}
      source={{ html, baseUrl: ARTICLE_BASE_URL }}
      originWhitelist={['*']}
      injectedJavaScriptBeforeContentLoaded={LINK_CAPTURE_SCRIPT}
      onMessage={onMessage}
      onShouldStartLoadWithRequest={onNavigate}
      setSupportMultipleWindows={false}
      style={{ backgroundColor: background }}
      testID="reader-webview"
    />
  );
}
