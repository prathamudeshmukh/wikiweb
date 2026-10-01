import { classifyReaderLink } from './readerLinks';

const BASE = 'https://en.wikipedia.org/api/rest_v1/page/mobile-html/';

describe('classifyReaderLink', () => {
  it('treats a relative article link as an article to peek at', () => {
    expect(classifyReaderLink(`${BASE}Leonardo_da_Vinci`)).toEqual({ kind: 'article', title: 'Leonardo da Vinci' });
  });

  it('accepts /wiki/ links too, decoding the title and dropping the section', () => {
    expect(classifyReaderLink('https://en.wikipedia.org/wiki/Iron(II)_sulfate#Uses')).toEqual({ kind: 'article', title: 'Iron(II) sulfate' });
    expect(classifyReaderLink(`${BASE}Caf%C3%A9`)).toEqual({ kind: 'article', title: 'Café' });
  });

  it('lets in-page anchors (footnotes, sections) scroll normally', () => {
    expect(classifyReaderLink(`${BASE}Iron_gall_ink#cite_note-3`, 'Iron gall ink')).toEqual({ kind: 'anchor' });
    expect(classifyReaderLink('about:blank#top')).toEqual({ kind: 'anchor' });
  });

  it('ignores files, other namespaces and edit links', () => {
    expect(classifyReaderLink(`${BASE}File:Oak_galls.jpg`)).toEqual({ kind: 'ignore' });
    expect(classifyReaderLink(`${BASE}Help:IPA/English`)).toEqual({ kind: 'ignore' });
    expect(classifyReaderLink('https://en.wikipedia.org/w/index.php?title=Iron_gall_ink&action=edit&section=1')).toEqual({ kind: 'ignore' });
  });

  it('opens links to other sites outside the app', () => {
    expect(classifyReaderLink('https://www.archives.gov/preservation')).toEqual({ kind: 'external', url: 'https://www.archives.gov/preservation' });
  });

  it('ignores schemes that are not web links', () => {
    expect(classifyReaderLink('javascript:void(0)')).toEqual({ kind: 'ignore' });
    expect(classifyReaderLink('not a url')).toEqual({ kind: 'ignore' });
  });

  it('lets the initial document load through', () => {
    expect(classifyReaderLink(BASE)).toEqual({ kind: 'document' });
  });
});
