import type { ExternalPlaceResult } from "./types";

// Ten sam realny obiekt z zewnętrznego dostawcy (ten sam externalId) bywa
// znaleziony niezależnie przez więcej niż jedną kotwicę wyszukiwania, gdy
// leżą blisko siebie — patrz getRoutePlaces.ts i getCategoryPlaces.ts, oba
// przeszukujące wiele kotwic naraz. Współdzielone tu, żeby obie orkiestracje
// (generator tras i przeglądanie kategorii) używały dokładnie tej samej
// reguły dedupikacji, zamiast dwóch osobnych kopii.
export function dedupeByExternalId(
  results: ExternalPlaceResult[],
): ExternalPlaceResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.externalId)) return false;
    seen.add(r.externalId);
    return true;
  });
}
