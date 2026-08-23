import { test } from "node:test";
import assert from "node:assert/strict";
import { filterActiveRegionTypes, ACTIVE_REGION_TYPE_OPTIONS } from "./placeFilters";

// Dowód dla punktu 2 ścieżki naprawczej (plan rozwoju, 16.08): appka ma
// realnie obsługiwać tylko Wielkopolskę i wybrzeże, więc "Morze" musi
// zostać jedynym aktywnym typem regionu, a każda próba przemycenia innego
// (np. przez ręcznie wklejony link ?regionType=Góry) musi zostać odrzucona
// tu, niezależnie od tego, co dzieje się w UI formularza.

test("Morze jest jedynym aktywnym typem regionu", () => {
  assert.deepEqual(ACTIVE_REGION_TYPE_OPTIONS, ["Morze"]);
});

test("odrzuca nieaktywne typy regionu (Góry, Jeziora, Miasta, Lasy, Rzeka)", () => {
  assert.deepEqual(
    filterActiveRegionTypes(["Góry", "Jeziora", "Miasta", "Lasy", "Rzeka"]),
    [],
  );
});

test("przepuszcza Morze i odrzuca resztę z tej samej listy", () => {
  assert.deepEqual(filterActiveRegionTypes(["Morze", "Góry"]), ["Morze"]);
});

test("pusta lista wejściowa daje pustą listę wyjściową", () => {
  assert.deepEqual(filterActiveRegionTypes([]), []);
});
