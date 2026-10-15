const MAX_TOKENS = 6;

/** Lower-cases, strips diacritics and splits free text into safe alphanumeric tokens. */
export function tokenize(input: string): string[] {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, MAX_TOKENS);
}

/**
 * Builds a prefix-matching tsquery (`tok1:* & tok2:*`) for as-you-type search.
 * Tokens are restricted to [a-z0-9], so the result is always valid tsquery syntax
 * and is still passed as a bound parameter, never interpolated.
 */
export function buildPrefixTsQuery(input: string): string | null {
  const tokens = tokenize(input);
  return tokens.length ? tokens.map((t) => `${t}:*`).join(' & ') : null;
}
