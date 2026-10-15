import { buildPrefixTsQuery, tokenize } from './search-query.js';

describe('tokenize', () => {
  it('lower-cases, strips accents and punctuation', () => {
    expect(tokenize("Café Lola's  Halo-Halo!")).toEqual(['cafe', 'lola', 's', 'halo', 'halo']);
  });

  it('drops tsquery operators so user input cannot alter the query', () => {
    expect(tokenize("adobo & !(lechon) | 'x':*")).toEqual(['adobo', 'lechon', 'x']);
  });

  it('caps the number of tokens', () => {
    expect(tokenize('a b c d e f g h')).toHaveLength(6);
  });
});

describe('buildPrefixTsQuery', () => {
  it('joins prefix tokens with AND', () => {
    expect(buildPrefixTsQuery('ube pan')).toBe('ube:* & pan:*');
  });

  it('returns null for input with no searchable characters', () => {
    expect(buildPrefixTsQuery('  !!  ')).toBeNull();
  });
});
