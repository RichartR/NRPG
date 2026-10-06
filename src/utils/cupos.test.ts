import { describe, it, expect } from 'vitest';
import { getCuposMaximosClan } from './cupos';

describe('cupos utils', () => {
  describe('getCuposMaximosClan', () => {
    it('returns default minimum 4 cupos for 14 village slots or fewer', () => {
      expect(getCuposMaximosClan(14)).toBe(4);
      expect(getCuposMaximosClan(10)).toBe(4);
      expect(getCuposMaximosClan(0)).toBe(4);
      expect(getCuposMaximosClan(null)).toBe(4);
      expect(getCuposMaximosClan(undefined)).toBe(4);
    });

    it('calculates clan slots expansion at every 5 village slots threshold', () => {
      // 14 -> 4
      expect(getCuposMaximosClan(14)).toBe(4);
      // 15 -> 5
      expect(getCuposMaximosClan(15)).toBe(5);
      expect(getCuposMaximosClan(16)).toBe(5);
      expect(getCuposMaximosClan(19)).toBe(5);
      // 20 -> 6
      expect(getCuposMaximosClan(20)).toBe(6);
      expect(getCuposMaximosClan(24)).toBe(6);
      // 25 -> 7
      expect(getCuposMaximosClan(25)).toBe(7);
      // 30 -> 8
      expect(getCuposMaximosClan(30)).toBe(8);
    });

    it('handles numeric string inputs correctly', () => {
      expect(getCuposMaximosClan('20')).toBe(6);
      expect(getCuposMaximosClan('25')).toBe(7);
    });
  });
});
