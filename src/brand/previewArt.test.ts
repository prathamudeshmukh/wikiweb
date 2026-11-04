import { PREVIEW_CANVAS, PREVIEW_LAYOUT, previewSvg, SQUARE_CROP } from './previewArt';

const countOf = (svg: string, needle: string) => svg.split(needle).length - 1;

describe('preview art', () => {
  it('paints a 1200 × 630 paper canvas', () => {
    const svg = previewSvg();

    expect(PREVIEW_CANVAS).toEqual({ width: 1200, height: 630 });
    expect(svg).toContain('width="1200" height="630" viewBox="0 0 1200 630"');
    expect(svg).toContain('<rect width="1200" height="630" fill="#F4EDE0"/>');
  });

  it('shows the Octopus card swiping over Cephalopod intelligence', () => {
    const svg = previewSvg();

    expect(svg).toContain('>Octopus</text>');
    expect(svg).toContain('>Cephalopod</text>');
    expect(svg).toContain('>TAKE A TANGENT →</text>');
  });

  it('sets the wordmark and the three-line pitch', () => {
    const svg = previewSvg();

    expect(svg).toContain('>tangent</text>');
    expect(countOf(svg, 'data-role="pitch"')).toBe(3);
  });

  it('keeps the tilted swiping card inside the square crop that WhatsApp keeps', () => {
    const { x, width, height } = PREVIEW_LAYOUT.swipingCard;
    const tilt = (Math.abs(PREVIEW_LAYOUT.swipeTiltDeg) * Math.PI) / 180;
    const halfSpan = (width * Math.cos(tilt) + height * Math.sin(tilt)) / 2;
    const centre = x + width / 2;

    expect(centre - halfSpan).toBeGreaterThanOrEqual(SQUARE_CROP.left);
    expect(centre + halfSpan).toBeLessThanOrEqual(SQUARE_CROP.right);
  });

  it('draws the why-line marks as shapes, since Plex Mono has no ★ or ↳', () => {
    const svg = previewSvg();

    expect(svg).not.toMatch(/[★↳]/);
    expect(countOf(svg, 'data-role="why-mark"')).toBe(2);
  });
});
