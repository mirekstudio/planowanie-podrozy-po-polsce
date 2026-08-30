import { test, mock } from "node:test";
import assert from "node:assert/strict";
import type { Nocleg } from "@/data/noclegi";
import type { ExternalPlaceResult } from "@/lib/placesProviders";
import { getAccommodationOptions } from "./accommodation";

// Dowód dla punktu 2 ścieżki naprawczej, część 2 (23.08): fallback
// noclegowy miał wcześniej własny, osobny fetch do Geoapify — bez filtra
// granic Polski, bez country_code, bez looksLikeNonTouristPlace. Teraz
// korzysta ze współdzielonej fetchProtectedPlaces i dodatkowo z
// isWithinSupportedRegions. Testy poniżej wstrzykują fałszywego dostawcę
// (bez sieci) w miejsce fetchProtectedPlaces.

function makeNocleg(overrides: Partial<Nocleg> & { lat: number; lng: number }): Nocleg {
  return {
    id: "nocleg-1",
    nazwa: "Testowy nocleg",
    typ: "hotel",
    miejscePowiazane: null,
    udogodnienia: null,
    poziomKomfortu: null,
    ...overrides,
  };
}

function makeExternal(overrides: Partial<ExternalPlaceResult> = {}): ExternalPlaceResult {
  return {
    externalId: "ext-1",
    title: "Zewnętrzny nocleg",
    description: "Opis",
    lat: 52.4064,
    lng: 16.9252,
    image: null,
    imageAlt: "Zewnętrzny nocleg",
    sourceUrl: null,
    ...overrides,
  };
}

test("gdy jest dopasowanie w bazie, NIE odpytuje zewnętrznego dostawcy", async () => {
  const point = { lat: 52.4064, lng: 16.9252 };
  const noclegi = [makeNocleg({ id: "n1", nazwa: "Hotel Blisko", lat: 52.41, lng: 16.93 })];
  const fetchPlaces = mock.fn(async () => []);

  const result = await getAccommodationOptions(point, noclegi, { transport: "car" }, fetchPlaces);

  assert.equal(fetchPlaces.mock.callCount(), 0, "nie powinien wywołać dostawcy zewnętrznego");
  assert.equal(result.length, 1);
  assert.equal(result[0].source, "curated");
});

test("brak dopasowania w bazie: fallback dodaje wynik leżący wewnątrz wspieranego regionu (Wielkopolska)", async () => {
  const point = { lat: 52.4064, lng: 16.9252 };
  const fetchPlaces = mock.fn(async () => [
    makeExternal({ externalId: "gniezno-hotel", title: "Hotel w Gnieźnie", lat: 52.5347, lng: 17.5827, categories: ["accommodation.hotel"] }),
  ]);

  const result = await getAccommodationOptions(point, [], { transport: "car" }, fetchPlaces);

  assert.ok(fetchPlaces.mock.callCount() > 0, "powinien wywołać dostawcę zewnętrznego");
  assert.equal(result.length, 1);
  assert.equal(result[0].nazwa, "Hotel w Gnieźnie");
  assert.equal(result[0].source, "basic");
  assert.equal(result[0].typ, "hotel");
});

test("brak dopasowania w bazie: fallback odrzuca wynik leżący poza wspieranymi regionami", async () => {
  const point = { lat: 52.4064, lng: 16.9252 };
  // Realny przypadek z audytu 23.08: okolice Koła, tuż za wschodnią
  // granicą Wielkopolski.
  const fetchPlaces = mock.fn(async () => [
    makeExternal({ externalId: "kolo-hotel", title: "Hotel pod Kołem", lat: 52.1978208, lng: 18.6085176 }),
  ]);

  const result = await getAccommodationOptions(point, [], { transport: "car" }, fetchPlaces);

  assert.equal(
    result.length,
    0,
    "nocleg spoza Wielkopolski/wybrzeża nie powinien zostać zaproponowany",
  );
});

test("brak dopasowania w bazie i pusty wynik z dostawcy: zwraca pustą listę", async () => {
  const point = { lat: 52.4064, lng: 16.9252 };
  const fetchPlaces = mock.fn(async () => []);

  const result = await getAccommodationOptions(point, [], { transport: "car" }, fetchPlaces);

  assert.deepEqual(result, []);
});
