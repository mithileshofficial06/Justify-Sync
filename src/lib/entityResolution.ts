/**
 * v4 Flaw #18: detecting "more than one pending case" is entity resolution
 * across records, not document reading — the same person can appear
 * differently across FIRs (name transliteration, approximate age, free-text
 * address), with no shared person-level ID. A charge sheet alone can't
 * answer this even read perfectly.
 *
 * This is a real implementation (Jaro-Winkler name similarity + age
 * proximity), not a stub — but per the spec, it only ever produces
 * candidate matches for a human to confirm. It NEVER auto-sets
 * CONFIRMED_MULTI itself; that stays a human decision via manual override.
 */

function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;

  const matchDistance = Math.max(Math.floor(Math.max(aLen, bLen) / 2) - 1, 0);
  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);

  let matches = 0;
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (matches / aLen + matches / bLen + (matches - transpositions / 2) / matches) / 3;
}

/** Jaro-Winkler: boosts the Jaro score for strings sharing a common prefix — handles the common case of transliteration variance at the end of a name (Mohd/Mohammed/Muhammad). */
export function nameSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  const jaro = jaroSimilarity(s1, s2);

  let prefixLen = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] !== s2[i]) break;
    prefixLen++;
  }

  return jaro + prefixLen * 0.1 * (1 - jaro);
}

export interface CandidatePerson {
  id: string;
  nameVariants: string[];
  approxAge: number | null;
}

export interface PotentialMatch {
  personId: string;
  matchedName: string;
  similarity: number;
}

const NAME_SIMILARITY_THRESHOLD = 0.82;
const MAX_AGE_DELTA = 3;

/**
 * Returns candidate matches above threshold, sorted best-first. Never
 * returns a verdict — only candidates for a human to look at (v4 Flaw #18:
 * "matches below a threshold go to a possible-match human-check queue
 * rather than being silently accepted or rejected" — and even above
 * threshold, this function only surfaces the candidate, it doesn't decide).
 */
export function findPotentialMatches(
  target: CandidatePerson,
  candidates: CandidatePerson[]
): PotentialMatch[] {
  const results: PotentialMatch[] = [];

  for (const candidate of candidates) {
    if (candidate.id === target.id) continue;

    if (
      target.approxAge !== null &&
      candidate.approxAge !== null &&
      Math.abs(target.approxAge - candidate.approxAge) > MAX_AGE_DELTA
    ) {
      continue;
    }

    let best = 0;
    let bestName = "";
    for (const tName of target.nameVariants) {
      for (const cName of candidate.nameVariants) {
        const score = nameSimilarity(tName, cName);
        if (score > best) {
          best = score;
          bestName = cName;
        }
      }
    }

    if (best >= NAME_SIMILARITY_THRESHOLD) {
      results.push({ personId: candidate.id, matchedName: bestName, similarity: best });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}
