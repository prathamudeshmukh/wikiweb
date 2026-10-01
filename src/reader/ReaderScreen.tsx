import * as WebBrowser from 'expo-web-browser';
import { CaretDown, CloudSlash } from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { reportError } from '../services/reportError';
import { FONT } from '../theme/fonts';
import { LAYOUT, TYPE } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import type { Article } from '../wiki-api/types';
import { PeekCard } from './PeekCard';
import { LINK_CAPTURE_SCRIPT, parseReaderMessage, scrollToAnchorScript } from './readerBridge';
import { classifyReaderLink } from './readerLinks';
import { useArticleDocument } from './useArticleDocument';

interface ReaderScreenProps {
  initialTitle: string;
  onTangent: (article: Article) => void;
  /** A peeked article is now being read in place. */
  onReadLink: (article: Article) => void;
  onClose: () => void;
}

// mobile-html uses relative links (./Ink) and protocol-relative scripts; this base resolves both.
const ARTICLE_BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/mobile-html/';

function ReaderStatus({ status, onRetry }: { status: 'loading' | 'error'; onRetry: () => void }) {
  const palette = useTheme();
  if (status === 'loading') return <ActivityIndicator style={styles.status} color={palette.muted} accessibilityLabel="Loading article" />;
  return (
    <Pressable style={styles.status} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Couldn’t load this article. Tap to retry.">
      <CloudSlash size={32} color={palette.muted} />
      <Text style={[styles.caption, { color: palette.muted }]}>COULDN’T LOAD — TAP TO RETRY</Text>
    </Pressable>
  );
}

/** The article sheet (SPEC.md §3.4): reads in place; links open a peek card instead of navigating. */
export function ReaderScreen({ initialTitle, onTangent, onReadLink, onClose }: ReaderScreenProps) {
  const palette = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initialTitle);
  const [peekTitle, setPeekTitle] = useState<string | null>(null);
  const { document, retry } = useArticleDocument(title);
  const webView = useRef<WebView>(null);

  /** Acts on a link; returns whether the WebView itself should follow it. */
  const followLink = useCallback(
    (url: string): boolean => {
      const link = classifyReaderLink(url, title);
      if (link.kind === 'document') return true;
      if (link.kind === 'anchor') {
        const scroll = scrollToAnchorScript(url);
        if (scroll) webView.current?.injectJavaScript(scroll);
      }
      if (link.kind === 'article') setPeekTitle(link.title);
      if (link.kind === 'external') WebBrowser.openBrowserAsync(link.url).catch((error: unknown) => reportError('reader.external', error));
      return false;
    },
    [title],
  );

  // Link taps arrive as messages (see readerBridge); real navigations are only the document itself.
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const message = parseReaderMessage(event.nativeEvent.data);
    if (message) followLink(message.href);
  }, [followLink]);
  const onNavigate = useCallback((request: WebViewNavigation) => followLink(request.url), [followLink]);

  const read = useCallback(
    (article: Article) => {
      setPeekTitle(null);
      setTitle(article.title);
      onReadLink(article);
    },
    [onReadLink],
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.paper, paddingTop: insets.top }]}>
      <View style={[styles.bar, { borderColor: palette.line }]}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close article" hitSlop={8} style={styles.closeButton}>
          <CaretDown size={22} color={palette.ink} />
        </Pressable>
        <Text style={[styles.barTitle, { color: palette.muted }]} numberOfLines={1}>{title.toUpperCase()}</Text>
      </View>
      {document.status === 'ready' ? (
        <WebView
          key={title}
          ref={webView}
          source={{ html: document.html, baseUrl: ARTICLE_BASE_URL }}
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={LINK_CAPTURE_SCRIPT}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onNavigate}
          setSupportMultipleWindows={false}
          style={{ backgroundColor: palette.paper }}
          testID="reader-webview"
        />
      ) : (
        <ReaderStatus status={document.status} onRetry={retry} />
      )}
      {peekTitle && <PeekCard title={peekTitle} onTangent={onTangent} onRead={read} onClose={() => setPeekTitle(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { height: LAYOUT.headerHeight, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  closeButton: { width: LAYOUT.minTouchTarget, height: LAYOUT.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, fontFamily: FONT.mono, ...TYPE.crumb },
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  caption: { fontFamily: FONT.mono, ...TYPE.meta },
});
