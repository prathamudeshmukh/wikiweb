import lead from './__fixtures__/section-octopus-0.json';
import { extractArticleLinks } from './linkExtraction';

const titlesOf = (html: string) => extractArticleLinks(html).map((link) => link.title);

describe('extractArticleLinks', () => {
  describe('on the real Octopus lead section', () => {
    const links = titlesOf(lead.parse.text);

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

    expect(titlesOf(html)).toEqual(['Café au lait', 'AT&T', 'Squid', 'Tom & Jerry']);
  });

  it('ignores links inside tables, including nested ones', () => {
    const html = '<table><tr><td><table><tr><td><a href="/wiki/Inner">i</a></td></tr></table><a href="/wiki/Outer">o</a></td></tr></table><p><a href="/wiki/Body">b</a></p>';

    expect(titlesOf(html)).toEqual(['Body']);
  });

  it('ignores citation markers', () => {
    const html = '<p>Claim<sup id="cite_ref-1" class="reference"><a href="/wiki/Not_this">[1]</a></sup> <a href="/wiki/This">t</a></p>';

    expect(titlesOf(html)).toEqual(['This']);
  });

  it('keeps titles that contain a colon but are not namespaces', () => {
    const html = '<p><a href="/wiki/Star_Wars:_Episode_IV">s</a><a href="/wiki/Special:Random">r</a></p>';

    expect(titlesOf(html)).toEqual(['Star Wars: Episode IV']);
  });

  it('lists each title once, at its first position, counting how often it is linked', () => {
    const html = '<p><a href="/wiki/Squid">a</a><a href="/wiki/Ink">i</a><a href="/wiki/Squid">b</a><a href="/wiki/Squid#Anatomy">c</a></p>';

    expect(extractArticleLinks(html)).toEqual([{ title: 'Squid', mentions: 3 }, { title: 'Ink', mentions: 1 }]);
  });

  it('ignores notice boxes such as the script-rendering warning', () => {
    const html =
      '<div class="side-box side-box-right plainlinks"><div class="side-box-flex"><div class="side-box-text plainlist">' +
      '<a href="/wiki/Tibetan_script">t</a> may show <a href="/wiki/Mojibake">m</a></div></div></div>' +
      '<div class="box-Unreferenced ambox"><a href="/wiki/Citation_needed">c</a></div><p><a href="/wiki/Lhotse">l</a></p>';

    expect(titlesOf(html)).toEqual(['Lhotse']);
  });

  it('returns nothing for empty or link-free HTML', () => {
    expect(titlesOf('')).toEqual([]);
    expect(titlesOf('<p>No links here.</p>')).toEqual([]);
  });
});
