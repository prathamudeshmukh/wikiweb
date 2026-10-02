import { TANGENT_GLYPH } from './tangentGlyph';
import { capCentredBaseline, glyphOrigin, rimSlots, safeZoneScale, slotAnglesDeg, STAR } from './iconGeometry';

describe('icon geometry', () => {
  describe('rimSlots', () => {
    it('gives every letter, star and gap one slot, with a gap after each token', () => {
      const slots = rimSlots('TANGENT ✦ TANGENT ✦');

      expect(slots).toHaveLength(20);
      expect(slots.slice(6, 10)).toEqual(['T', ' ', STAR, ' ']);
    });

    it('rejects empty rim text', () => {
      expect(() => rimSlots('   ')).toThrow('Rim text is empty');
    });
  });

  describe('slotAnglesDeg', () => {
    it('centres the lead word at the top and spaces the stars evenly opposite each other', () => {
      const angles = slotAnglesDeg(20, 7);

      expect((angles[0] + angles[6]) / 2).toBeCloseTo(-90);
      expect(angles[8]).toBeCloseTo(0);
      expect(angles[18]).toBeCloseTo(180);
    });

    it('rejects a lead word longer than the ring', () => {
      expect(() => slotAnglesDeg(5, 7)).toThrow('Lead word does not fit');
    });
  });

  describe('capCentredBaseline', () => {
    it('puts the caps midway between the two rings', () => {
      const baseline = capCentredBaseline({ inner: 300, outer: 400 }, 40);

      expect(baseline).toBe(330);
    });

    it('rejects a band whose inner edge is outside its outer edge', () => {
      expect(() => capCentredBaseline({ inner: 400, outer: 300 }, 40)).toThrow('Rim band is inverted');
    });
  });

  describe('safeZoneScale', () => {
    it('shrinks the stamp so its outer edge sits on the safe-zone circle', () => {
      const scale = safeZoneScale({ stampRadius: 400, canvas: 1000, safeZoneFraction: 0.6 });

      expect(scale).toBeCloseTo(0.75);
    });

    it('rejects a safe-zone fraction outside (0, 1]', () => {
      expect(() => safeZoneScale({ stampRadius: 400, canvas: 1000, safeZoneFraction: 1.2 })).toThrow('Safe-zone fraction');
    });
  });

  describe('glyphOrigin', () => {
    it("lands the glyph's circle on the given centre", () => {
      const origin = glyphOrigin({ x: 512, y: 512 }, 20);
      const { cx, cy } = TANGENT_GLYPH.circle;

      expect(origin.x + cx * 20).toBe(512);
      expect(origin.y + cy * 20).toBe(512);
    });

    it('rejects a non-positive scale', () => {
      expect(() => glyphOrigin({ x: 512, y: 512 }, 0)).toThrow('Glyph scale must be positive');
    });
  });
});
