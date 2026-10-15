import { buildFrameDocument, FRAME_BRIDGE_SCRIPT, frameMessageHandler, scrollMessage } from './frameBridge';

const ARTICLE = '<!DOCTYPE html><html><head prefix="mwr: //en.wikipedia.org/wiki/Special:Redirect/"><base href="//en.wikipedia.org/wiki/"><title>Octopus</title></head><body><header>Octopus</header></body></html>';

describe('buildFrameDocument', () => {
  it('resolves the page’s protocol-relative links over https, not the app’s scheme', () => {
    const doc = buildFrameDocument(ARTICLE);

    expect(doc).toContain('<base href="https://en.wikipedia.org/wiki/">');
    expect(doc).not.toContain('<base href="//');
  });

  it('puts the bridge first in the head, so it hears taps before the page’s own script', () => {
    const doc = buildFrameDocument(ARTICLE);

    expect(doc).toContain(`<head prefix="mwr: //en.wikipedia.org/wiki/Special:Redirect/"><script>${FRAME_BRIDGE_SCRIPT}</script><base`);
  });

  it('never mistakes a <header> for the head', () => {
    const doc = buildFrameDocument('<body><header>Octopus</header></body>');

    expect(doc.startsWith(`<script>${FRAME_BRIDGE_SCRIPT}</script>`)).toBe(true);
    expect(doc).toContain('<header>Octopus</header>');
  });
});

describe('FRAME_BRIDGE_SCRIPT', () => {
  it('captures link taps before the page’s handlers and posts them to the parent', () => {
    expect(FRAME_BRIDGE_SCRIPT).toContain("addEventListener('click'");
    expect(FRAME_BRIDGE_SCRIPT).toContain("parent.postMessage(");
    expect(FRAME_BRIDGE_SCRIPT).not.toContain('ReactNativeWebView');
  });

  it('only takes scroll requests from the parent', () => {
    expect(FRAME_BRIDGE_SCRIPT).toContain('event.source !== parent');
  });
});

describe('scrollMessage', () => {
  it('asks the frame to scroll to an element id', () => {
    expect(JSON.parse(scrollMessage('cite_note-3'))).toEqual({ type: 'scrollTo', id: 'cite_note-3' });
  });
});

describe('frameMessageHandler', () => {
  const frame = { name: 'reader frame' };
  const link = JSON.stringify({ type: 'link', href: 'https://en.wikipedia.org/wiki/Ink' });

  function setup() {
    const onLink = jest.fn();
    return { onLink, handle: frameMessageHandler(() => frame, onLink) };
  }

  it('passes on a link tap from the reader frame', () => {
    const { onLink, handle } = setup();

    handle({ source: frame, data: link });

    expect(onLink).toHaveBeenCalledWith('https://en.wikipedia.org/wiki/Ink');
  });

  it('ignores messages from any other window', () => {
    const { onLink, handle } = setup();

    handle({ source: { name: 'some other frame' }, data: link });

    expect(onLink).not.toHaveBeenCalled();
  });

  it('ignores frame messages that are not link taps', () => {
    const { onLink, handle } = setup();

    handle({ source: frame, data: { type: 'link', href: 'not a string message' } });
    handle({ source: frame, data: '{"type":"other"}' });

    expect(onLink).not.toHaveBeenCalled();
  });
});
