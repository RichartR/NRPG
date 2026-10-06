import { describe, it, expect } from 'vitest';
import { normalizeSearchText, searchIncludes, searchAny } from './search';

describe('search utils', () => {
  describe('normalizeSearchText', () => {
    it('lowercases text and removes accents/diacritics', () => {
      expect(normalizeSearchText('Técnica Ígnea Rápida')).toBe('tecnica ignea rapida');
      expect(normalizeSearchText('ÁÉÍÓÚñü')).toBe('aeiounu');
    });

    it('replaces special ligatures and letters properly', () => {
      expect(normalizeSearchText('dæmon')).toBe('daemon');
      expect(normalizeSearchText('cœur')).toBe('coeur');
      expect(normalizeSearchText('Schloß')).toBe('schloss');
      expect(normalizeSearchText('København')).toBe('kobenhavn');
    });

    it('handles null, undefined, and non-string inputs safely', () => {
      expect(normalizeSearchText(null)).toBe('');
      expect(normalizeSearchText(undefined)).toBe('');
      expect(normalizeSearchText(12345)).toBe('12345');
    });
  });

  describe('searchIncludes', () => {
    it('matches substrings regardless of accents and case', () => {
      expect(searchIncludes('Gran Bola de Fuego', 'fuego')).toBe(true);
      expect(searchIncludes('Gran Bola de Fuego', 'BOLA')).toBe(true);
      expect(searchIncludes('Técnica Milenaria', 'tecnica')).toBe(true);
    });

    it('returns true when query is empty or whitespace', () => {
      expect(searchIncludes('Cualquier cosa', '')).toBe(true);
      expect(searchIncludes('Cualquier cosa', '   ')).toBe(true);
    });

    it('returns false when query is not included', () => {
      expect(searchIncludes('Chidori', 'Rasengan')).toBe(false);
    });
  });

  describe('searchAny', () => {
    it('returns true if query matches any item in the values array', () => {
      const fields = ['Uchiha Sasuke', 'Konohagakure', 'Katon'];
      expect(searchAny('sasuke', fields)).toBe(true);
      expect(fields.length).toBe(3);
      expect(searchAny('konoha', fields)).toBe(true);
    });

    it('returns false if query matches none of the fields', () => {
      const fields = ['Uchiha Sasuke', 'Konohagakure'];
      expect(searchAny('Sunagakure', fields)).toBe(false);
    });
  });
});
