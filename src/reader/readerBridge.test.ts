import { LINK_CAPTURE_SCRIPT, parseReaderMessage, scrollToAnchorScript } from './readerBridge';

describe('reader bridge', () => {
  describe('parseReaderMessage', () => {
    it('reads a link tap from the page', () => {
      expect(parseReaderMessage(JSON.stringify({ type: 'link', href: 'https://en.wikipedia.org/wiki/Ink' }))).toEqual({ href: 'https://en.wikipedia.org/wiki/Ink' });
    });

    it('ignores messages it does not understand', () => {
      expect(parseReaderMessage('not json')).toBeNull();
      expect(parseReaderMessage(JSON.stringify({ type: 'scroll', y: 10 }))).toBeNull();
      expect(parseReaderMessage(JSON.stringify({ type: 'link' }))).toBeNull();
    });
  });

  describe('scrollToAnchorScript', () => {
    it('scrolls to the element named by the URL fragment', () => {
      const script = scrollToAnchorScript('https://en.wikipedia.org/api/rest_v1/page/mobile-html/Ink#cite_note-3');

      expect(script).toContain('"cite_note-3"');
      expect(script).toContain('scrollIntoView');
    });

    it('safely quotes fragments with odd characters', () => {
      const script = scrollToAnchorScript('about:blank#a"b%27c');

      expect(script).toContain(JSON.stringify("a\"b'c"));
    });

    it('returns nothing when there is no fragment', () => {
      expect(scrollToAnchorScript('https://en.wikipedia.org/wiki/Ink')).toBeNull();
    });
  });

  it('captures link taps before the page’s own handlers and posts them to the app', () => {
    expect(LINK_CAPTURE_SCRIPT).toContain("addEventListener('click'");
    expect(LINK_CAPTURE_SCRIPT).toContain('true)');
    expect(LINK_CAPTURE_SCRIPT).toContain('ReactNativeWebView.postMessage');
  });
});
