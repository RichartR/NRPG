const SEARCH_CHAR_REPLACEMENTS: Record<string, string> = {
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ł: 'l',
  ß: 'ss'
};

export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[æœøđðþłß]/g, char => SEARCH_CHAR_REPLACEMENTS[char] || char);
}

export function searchIncludes(value: unknown, query: unknown): boolean {
  const normalizedQuery = normalizeSearchText(query).trim();
  if (!normalizedQuery) return true;
  return normalizeSearchText(value).includes(normalizedQuery);
}

export function searchAny(query: unknown, values: unknown[]): boolean {
  return values.some(value => searchIncludes(value, query));
}
