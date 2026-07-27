function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Ähnlichkeit zweier Strings zwischen 0 (unähnlich) und 1 (identisch), basierend auf normalisierter Levenshtein-Distanz. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const distance = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - distance / maxLen;
}

export type MatchCandidate<T> = { item: T; score: number };

/** Sortiert `items` nach Ähnlichkeit zu `query` (absteigend), gefiltert auf einen Mindest-Score. */
export function bestMatches<T>(query: string, items: T[], getLabel: (item: T) => string, minScore = 0.5): MatchCandidate<T>[] {
  return items
    .map((item) => ({ item, score: similarity(query, getLabel(item)) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
