import { test, mock } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import type { ExternalPlaceResult } from "@/lib/placesProviders/types";
import { resolveRoutePlaces } from "./getRoutePlaces";

// Dowód dla punktu 2 ścieżki naprawczej, część 2 (23.08): gałąź ogólnego
// fallbacku w getRoutePlaces.ts (używana dla każdej trasy poza "Morze" —
// w praktyce niemal zawsze Wielkopolska) dociągała uzupełnienie z Geoapify
// bez sprawdzenia, czy wynik mieści się w granicach dwóch regionów, które
// appka dziś realnie obsługuje. Testy poniżej używają fałszywego dostawcy
// (bez sieci) i realnych współrzędnych z audytu 23.08.

let placeCounter = 0;

function makePlace(overrides: Partial<Place> & { lat: number; lng: number }): Place {
  placeCounter += 1;
  return {
    slug: `test-place-${placeCounter}`,
    title: `Testowe miejsce ${placeCounter}`,
    region: "Wielkopolska",
    description: "Opis testowy",
    longDescription: "Opis testowy",
    image: "",
    imageAlt: "",
    credit: { author: "Test", license: "CC0" },
    sortOrder: placeCounter,
    tags: ["Historia"],
    source: "curated",
    regionType: [],
    surroundings: [],
    nearbyAttraction: null,
    recommendedCampsites: [],
    culinaryTip: null,
    featured: false,
    ...overrides,
  };
}

function makeExternal(overrides: Partial<ExternalPlaceResult> = {}): ExternalPlaceResult {
  return {
    externalId: "ext-1",
    title: "Zewnętrzne miejsce",
    description: "Opis z zewnętrznego źródła.",
    lat: 52.4064,
    lng: 16.9252,
    image: null,
    imageAlt: "Zewnętrzne miejsce",
    sourceUrl: null,
    icon: "📍",
    ...overrides,
  };
}

test("gdy w bazie jest wystarczająco pasujących miejsc, ogólna gałąź NIE odpytuje zewnętrznego dostawcy", async () => {
  const curated = Array.from({ length: 4 }, () =>
    makePlace({ lat: 52.4064, lng: 16.9252 }),
  );
  const fetchPlaces = mock.fn(async () => []);

  const result = await resolveRoutePlaces(
    curated,
    { days: 3, interests: ["Historia"], regionTypes: [] },
    { fetchPlaces },
  );

  assert.equal(fetchPlaces.mock.callCount(), 0, "nie powinien wywołać dostawcy zewnętrznego");
  assert.equal(result.length, 4);
});

test("ogólna gałąź odrzuca wynik z Geoapify leżący poza wspieranymi regionami", async () => {
  const curated = [makePlace({ lat: 52.4064, lng: 16.9252 })]; // 1 < próg 4
  // Realny przypadek z audytu 23.08: ten punkt (okolice Koła) leży tuż za
  // wschodnią granicą WIELKOPOLSKA_BOUNDS.
  const fetchPlaces = mock.fn(async () => [
    makeExternal({ externalId: "kolo-poza-granica", title: "Zamek w Kole", lat: 52.1978208, lng: 18.6085176 }),
  ]);

  const result = await resolveRoutePlaces(
    curated,
    { days: 2, interests: ["Historia"], regionTypes: [] },
    { fetchPlaces },
  );

  assert.ok(
    !result.some((p) => p.title === "Zamek w Kole"),
    "wynik spoza Wielkopolski/wybrzeża nie powinien trafić do puli miejsc trasy",
  );
});

test("ogólna gałąź dodaje wynik z Geoapify leżący wewnątrz wspieranego regionu (Wielkopolska)", async () => {
  const curated = [makePlace({ lat: 52.4064, lng: 16.9252 })];
  const fetchPlaces = mock.fn(async () => [
    makeExternal({ externalId: "gniezno", title: "Katedra w Gnieźnie", lat: 52.5347, lng: 17.5827 }),
  ]);

  const result = await resolveRoutePlaces(
    curated,
    { days: 2, interests: ["Historia"], regionTypes: [] },
    { fetchPlaces },
  );

  assert.ok(
    result.some((p) => p.title === "Katedra w Gnieźnie" && p.source === "basic"),
    "wynik wewnątrz Wielkopolski powinien trafić do puli jako miejsce podstawowe",
  );
});

test("gałąź Morza (podregiony wybrzeża) nadal poprawnie przekazuje dostawcę po refaktorze fetchSupplementFrom", async () => {
  const fetchPlaces = mock.fn(async () => [
    makeExternal({ externalId: "swinoujscie", title: "Latarnia w Świnoujściu", lat: 53.9099, lng: 14.2477 }),
  ]);

  const result = await resolveRoutePlaces(
    [],
    { days: 3, interests: [], regionTypes: ["Morze"] },
    { fetchPlaces },
  );

  assert.ok(fetchPlaces.mock.callCount() > 0, "powinien wywołać dostawcę dla kotwic wybrzeża");
  const found = result.filter((p) => p.title === "Latarnia w Świnoujściu");
  assert.equal(found.length, 1, "wynik powinien pojawić się dokładnie raz (dedupe), przypisany do zachodniego wybrzeża");
  assert.equal(found[0].region, "zachodnie-wybrzeze");
});
