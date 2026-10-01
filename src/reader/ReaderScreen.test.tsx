import { act, fireEvent, screen } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import { renderWithServices } from '../__testing__/renderWithServices';
import { fakeWikiApi, makeArticle } from '../content/__testing__/fakeWikiApi';
import { ReaderScreen } from './ReaderScreen';

jest.mock('./readerFonts', () => ({ loadReaderFontFaces: async () => '' }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

// Captures the WebView's props so tests can play the part of the page: link taps arrive as messages
// from the injected script; the document load arrives as a navigation request.
interface CapturedWebView {
  source: { html: string };
  injectedJavaScriptBeforeContentLoaded: string;
  onMessage: (event: { nativeEvent: { data: string } }) => void;
  onShouldStartLoadWithRequest: (request: { url: string }) => boolean;
}
const mockWebViewProps: { current: CapturedWebView | null } = { current: null };
const mockInjectJavaScript = jest.fn();
jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    WebView: forwardRef((props: never, ref: unknown) => {
      useImperativeHandle(ref, () => ({ injectJavaScript: mockInjectJavaScript }));
      mockWebViewProps.current = props;
      return <View testID="reader-webview" />;
    }),
  };
});

const BASE = 'https://en.wikipedia.org/api/rest_v1/page/mobile-html/';
const navigate = (url: string) => mockWebViewProps.current?.onShouldStartLoadWithRequest({ url });
const tapLink = (href: string) => mockWebViewProps.current?.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'link', href }) } });

async function openReader(overrides: Parameters<typeof fakeWikiApi>[0] = {}) {
  const fake = fakeWikiApi(overrides);
  const onTangent = jest.fn();
  const onClose = jest.fn();
  const onReadLink = jest.fn();
  await renderWithServices(<ReaderScreen initialTitle="Iron gall ink" onTangent={onTangent} onReadLink={onReadLink} onClose={onClose} />, fake.api);
  await screen.findByTestId('reader-webview');
  return { ...fake, onTangent, onReadLink, onClose };
}

describe('ReaderScreen', () => {
  it('shows the article dressed for the reader, with attribution', async () => {
    await openReader();

    expect(mockWebViewProps.current?.source.html).toContain('Iron gall ink article');
    expect(mockWebViewProps.current?.source.html).toContain('CC BY-SA 4.0');
  });

  it('injects the link-capture script before the page’s own scripts run', async () => {
    await openReader();

    expect(mockWebViewProps.current?.injectedJavaScriptBeforeContentLoaded).toContain('ReactNativeWebView.postMessage');
  });

  it('peeks at a tapped article link', async () => {
    const leonardo = makeArticle('Leonardo da Vinci', { description: 'Italian polymath (1452–1519)' });
    await openReader({ articles: [leonardo] });

    await act(async () => void tapLink(`${BASE}Leonardo_da_Vinci`));

    expect(await screen.findByText('Italian polymath (1452–1519)')).toBeOnTheScreen();
  });

  it('also catches article links that arrive as navigations', async () => {
    await openReader();

    let allowed: boolean | undefined;
    await act(async () => {
      allowed = navigate(`${BASE}Ink`);
    });

    expect(allowed).toBe(false);
    expect(await screen.findByRole('button', { name: 'Take a tangent' })).toBeOnTheScreen();
  });

  it('scrolls to a footnote within the page', async () => {
    await openReader();

    await act(async () => void tapLink(`${BASE}Iron_gall_ink#cite_note-3`));

    expect(mockInjectJavaScript).toHaveBeenCalledWith(expect.stringContaining('"cite_note-3"'));
  });

  it('ignores page messages that are not link taps', async () => {
    await openReader();

    await act(async () => mockWebViewProps.current?.onMessage({ nativeEvent: { data: '{"type":"other"}' } }));

    expect(screen.queryByRole('button', { name: 'Take a tangent' })).toBeNull();
  });

  it('takes a tangent from the peek card', async () => {
    const { onTangent } = await openReader();
    await act(async () => void tapLink(`${BASE}Ink`));

    await fireEvent.press(await screen.findByRole('button', { name: 'Take a tangent' }));

    expect(onTangent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ink' }));
  });

  it('reads the peeked article in place', async () => {
    const { onReadLink } = await openReader();
    await act(async () => void tapLink(`${BASE}Ink`));

    await fireEvent.press(await screen.findByRole('button', { name: 'Read' }));

    expect(await screen.findByText('INK')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Take a tangent' })).toBeNull();
    expect(onReadLink).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ink' }));
  });

  it('will not take a tangent into a disambiguation page', async () => {
    await openReader({ articles: [makeArticle('Mercury', { isDisambiguation: true })] });
    await act(async () => void tapLink(`${BASE}Mercury`));

    expect(await screen.findByRole('button', { name: 'Take a tangent' })).toBeDisabled();
  });

  it('opens other websites in the browser', async () => {
    await openReader();

    await act(async () => void tapLink('https://www.archives.gov/preservation'));

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://www.archives.gov/preservation');
  });

  it('closes from the bar', async () => {
    const { onClose } = await openReader();

    await fireEvent.press(screen.getByRole('button', { name: 'Close article' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('offers a retry when the article fails to load', async () => {
    const fake = fakeWikiApi({});
    let fail = true;
    const articleHtml = fake.api.articleHtml;
    fake.api.articleHtml = (title) => (fail ? Promise.reject(new Error('offline')) : articleHtml(title));
    await renderWithServices(<ReaderScreen initialTitle="Ink" onTangent={jest.fn()} onReadLink={jest.fn()} onClose={jest.fn()} />, fake.api);

    const retry = await screen.findByRole('button', { name: 'Couldn’t load this article. Tap to retry.' });
    fail = false;
    await fireEvent.press(retry);

    expect(await screen.findByTestId('reader-webview')).toBeOnTheScreen();
  });
});
