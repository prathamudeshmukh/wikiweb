import { glyphSvg, stampSvg } from './iconArt';

const countOf = (svg: string, needle: string) => svg.split(needle).length - 1;

describe('icon art', () => {
  describe('stampSvg', () => {
    it('sets each rim letter on its own and draws the two stars as shapes', () => {
      const svg = stampSvg({ ink: '#1F1B16', background: '#F4EDE0' });

      expect(countOf(svg, '<text ')).toBe(14);
      expect(countOf(svg, 'data-role="star"')).toBe(2);
    });

    it('paints the background only when one is given', () => {
      const painted = stampSvg({ ink: '#1F1B16', background: '#F4EDE0' });
      const transparent = stampSvg({ ink: '#FFFFFF', background: null });

      expect(painted).toContain('<rect width="1024" height="1024" fill="#F4EDE0"/>');
      expect(transparent).not.toContain('<rect');
    });

    it('rejects a non-positive scale', () => {
      expect(() => stampSvg({ ink: '#000', background: null, scale: 0 })).toThrow('Stamp scale must be positive');
    });
  });

  describe('glyphSvg', () => {
    it('draws the wordmark glyph in ink on the background', () => {
      const svg = glyphSvg({ ink: '#1F1B16', background: '#F4EDE0', size: 48 });

      expect(svg).toContain('width="48" height="48"');
      expect(svg).toContain('fill="#F4EDE0"');
      expect(svg).toContain('stroke="#1F1B16"');
    });

    it('rejects a non-positive size', () => {
      expect(() => glyphSvg({ ink: '#000', background: '#fff', size: -1 })).toThrow('Glyph size must be positive');
    });
  });
});
