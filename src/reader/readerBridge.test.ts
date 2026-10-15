import { anchorId, LINK_CAPTURE_SCRIPT, parseReaderMessage, SCROLL_TO_ID_FUNCTION, scrollToIdScript } from './readerBridge';

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

  describe('anchorId', () => {
    it('names the element a link’s fragment points at', () => {
      expect(anchorId('https://en.wikipedia.org/api/rest_v1/page/mobile-html/Ink#cite_note-3')).toBe('cite_note-3');
    });

    it('decodes the fragment', () => {
      expect(anchorId('about:blank#a"b%27c')).toBe("a\"b'c");
    });

    it('returns nothing when there is no usable fragment', () => {
      expect(anchorId('https://en.wikipedia.org/wiki/Ink')).toBeNull();
      expect(anchorId('https://en.wikipedia.org/wiki/Ink#')).toBeNull();
      expect(anchorId('https://en.wikipedia.org/wiki/Ink#%E0%A4%A')).toBeNull();
    });
  });

  describe('scrollToIdScript', () => {
    it('scrolls to the element with that id', () => {
      const script = scrollToIdScript('cite_note-3');

      expect(script).toContain('"cite_note-3"');
      expect(script).toContain('scrollIntoView');
    });

    it('safely quotes ids with odd characters', () => {
      expect(scrollToIdScript("a\"b'c")).toContain(JSON.stringify("a\"b'c"));
    });
  });

  describe('SCROLL_TO_ID_FUNCTION', () => {
    // A footnote inside the References section, which PCS collapses (display: none) until its header is tapped.
    function fakePage() {
      const setHidden = jest.fn();
      const footnote = { scrollIntoView: jest.fn(), parentElement: null as unknown };
      const section = { id: 'pcs-section-content-17', classList: { contains: (name: string) => name === 'pcs-section-hidden' }, parentElement: null };
      footnote.parentElement = { id: 'mw-ref', classList: { contains: () => false }, parentElement: section };
      const document = { getElementById: (id: string) => (id === 'cite_note-1' ? footnote : null) };
      const window = { pcs: { c1: { Sections: { setHidden } } } };
      const scrollTo = new Function('window', 'document', `return ${SCROLL_TO_ID_FUNCTION}`)(window, document) as (id: string) => void;
      return { scrollTo, setHidden, footnote };
    }

    it('opens the collapsed section around the target, then scrolls to it', () => {
      const { scrollTo, setHidden, footnote } = fakePage();

      scrollTo('cite_note-1');

      expect(setHidden).toHaveBeenCalledWith('17', false);
      expect(footnote.scrollIntoView).toHaveBeenCalled();
    });

    it('does nothing for an id the page does not have', () => {
      const { scrollTo, setHidden } = fakePage();

      expect(() => scrollTo('cite_note-99')).not.toThrow();
      expect(setHidden).not.toHaveBeenCalled();
    });
  });

  it('captures link taps before the page’s own handlers and posts them to the app', () => {
    expect(LINK_CAPTURE_SCRIPT).toContain("addEventListener('click'");
    expect(LINK_CAPTURE_SCRIPT).toContain('true)');
    expect(LINK_CAPTURE_SCRIPT).toContain('ReactNativeWebView.postMessage');
  });
});
