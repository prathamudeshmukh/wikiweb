import lead from './__fixtures__/section-octopus-0.json';
import { extractArticleLinks } from './linkExtraction';

describe('extractArticleLinks', () => {
  describe('on the real Octopus lead section', () => {
    const links = extractArticleLinks(lead.parse.text);

    it('returns article links in reading order', () => {
      expect(links.slice(0, 6)).toEqual(['Mollusc', 'Order (biology)', 'Species', 'Cephalopod', 'Squid', 'Cuttlefish']);
    });

    it('skips hatnotes, files and other namespaces', () => {
      expect(links).not.toContain('Octopus (disambiguation)');
      expect(links.some((title) => /^(File|Help|Wikipedia|Category|Template):/.test(title))).toBe(false);
    });

    it('keeps links from deeper in the lead', () => {
      expect(links).toEqual(expect.arrayContaining(['Camouflage', 'Blue-ringed octopus']));
    });
  });

  it('decodes percent-encoding, entities and underscores, and drops fragments', () => {
    const html = '<p><a href="/wiki/Caf%C3%A9_au_lait">x</a> <a href="/wiki/AT%26T">y</a> <a href="/wiki/Squid#Anatomy">z</a> <a href="/wiki/Tom_&amp;_Jerry">w</a></p>';

    expect(extractArticleLinks(html)).toEqual(['Café au lait', 'AT&T', 'Squid', 'Tom & Jerry']);
  });

  it('ignores links inside tables, including nested ones', () => {
    const html = '<table><tr><td><table><tr><td><a href="/wiki/Inner">i</a></td></tr></table><a href="/wiki/Outer">o</a></td></tr></table><p><a href="/wiki/Body">b</a></p>';

    expect(extractArticleLinks(html)).toEqual(['Body']);
  });

  it('ignores citation markers', () => {
    const html = '<p>Claim<sup id="cite_ref-1" class="reference"><a href="/wiki/Not_this">[1]</a></sup> <a href="/wiki/This">t</a></p>';

    expect(extractArticleLinks(html)).toEqual(['This']);
  });

  it('keeps titles that contain a colon but are not namespaces', () => {
    const html = '<p><a href="/wiki/Star_Wars:_Episode_IV">s</a><a href="/wiki/Special:Random">r</a></p>';

    expect(extractArticleLinks(html)).toEqual(['Star Wars: Episode IV']);
  });

  it('lists each title once', () => {
    expect(extractArticleLinks('<p><a href="/wiki/Squid">a</a><a href="/wiki/Squid">b</a></p>')).toEqual(['Squid']);
  });

  it('returns nothing for empty or link-free HTML', () => {
    expect(extractArticleLinks('')).toEqual([]);
    expect(extractArticleLinks('<p>No links here.</p>')).toEqual([]);
  });
});
