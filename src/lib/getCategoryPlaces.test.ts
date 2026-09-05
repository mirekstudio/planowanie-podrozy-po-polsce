import { test, mock } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import type { ExternalPlaceResult } from "@/lib/placesProviders/types";

// Klucz musi być ustawiony PRZED pierwszym (dowolnym, choćby pośrednim)
// importem placesProviders/geoapify.ts — moduł czyta go raz, do stałej na
// poziomie modułu (patrz GEOAPIFY_API_KEY w geoapify.ts), więc bez klucza
// fetchPlaces krótko spina się do pustej tablicy i test C/D niczego by nie
// dowiódł. Dlatego ten plik celowo NIE ma żadnego statycznego importu
// ./getCategoryPlaces ani ./placesProviders/* na górze (te importy są
// hoistowane i wykonałyby się przed tą linią) — każdy test dociąga je
// przez dynamiczny import() dopiero we własnym ciele, już po tej linii.
process.env.GEOAPIFY_API_KEY = "test-key-do-zamockowanego-fetch";

// Testy "z dowodami" dla mechanizmu bank-danych-najpierw + fallback z sieci
// w widoku przeglądania kategorii (/miejsca?kategoria=X) — patrz audyt
// (23.08): ten widok wcześniej w ogóle nie miał fallbacku ani walidacji.

let placeCounter = 0;

function makeCurated(tag: string, overrides: Partial<Place> = {}): Place {
  placeCounter += 1;
  return {
    slug: `curated-${placeCounter}`,
    title: `Kuratorskie miejsce ${placeCounter}`,
    region: "Wielkopolska",
    description: "Opis testowy",
    longDescription: "Opis testowy",
    lat: 52.4,
    lng: 16.9,
    image: "",
    imageAlt: "",
    credit: { author: "Test", license: "CC0" },
    sortOrder: placeCounter,
    tags: [tag],
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
    title: "Muzeum Regionalne",
    description: "Opis z zewnętrznego źródła.",
    lat: 52.4,
    lng: 16.9,
    image: null,
    imageAlt: "Muzeum Regionalne",
    sourceUrl: null,
    icon: "📍",
    ...overrides,
  };
}

test("gdy w bazie jest wystarczająco dużo pasujących miejsc, appka NIE odpytuje zewnętrznego dostawcy", async () => {
  const { resolveCategoryPlaces, MIN_CATEGORY_RESULTS } = await import("./getCategoryPlaces");

  const curated = Array.from({ length: MIN_CATEGORY_RESULTS }, () => makeCurated("Historia"));
  const fetchPlaces = mock.fn(async () => []);

  const result = await resolveCategoryPlaces(curated, "Historia", { fetchPlaces });

  assert.equal(fetchPlaces.mock.callCount(), 0, "nie powinien wywołać dostawcy zewnętrznego");
  assert.equal(result.length, MIN_CATEGORY_RESULTS);
  assert.ok(result.every((p) => p.source === "curated"));
});

test("gdy w bazie jest za mało pasujących miejsc, fallback się uruchamia i uzupełnia wynik", async () => {
  const { resolveCategoryPlaces, MIN_CATEGORY_RESULTS } = await import("./getCategoryPlaces");

  const curated = Array.from({ length: MIN_CATEGORY_RESULTS - 2 }, () => makeCurated("Historia"));
  // Punkt (52.4, 16.9) leży w granicach WIELKOPOLSKA_BOUNDS — dostawca
  // (fałszywy) zwraca go dla każdej kotwicy, więc po dedupikacji powinien
  // trafić do wyniku dokładnie raz.
  const fetchPlaces = mock.fn(async () => [makeExternal()]);

  const result = await resolveCategoryPlaces(curated, "Historia", { fetchPlaces });

  assert.ok(fetchPlaces.mock.callCount() > 0, "powinien wywołać dostawcę zewnętrznego");
  assert.equal(result.filter((p) => p.source === "curated").length, curated.length);
  const basic = result.filter((p) => p.source === "basic");
  assert.equal(basic.length, 1, "wynik z dostawcy powinien pojawić się dokładnie raz po dedupikacji");
  assert.equal(basic[0].title, "Muzeum Regionalne");
  assert.equal(basic[0].slug, "geoapify-ext-1");
});

test("wynik spoza wspieranych dziś regionów (Wielkopolska + wybrzeże) jest odrzucany, nawet gdy treściowo wygląda w porządku", async () => {
  const { resolveCategoryPlaces, MIN_CATEGORY_RESULTS } = await import("./getCategoryPlaces");

  const curated = Array.from({ length: MIN_CATEGORY_RESULTS - 2 }, () => makeCurated("Historia"));
  // Zakopane — realna, atrakcyjna turystycznie lokalizacja, ale appka dziś
  // nie obsługuje Tatr/Gór (patrz ACTIVE_REGION_TYPE_OPTIONS w
  // placeFilters.ts) — punkt 6 zgłoszenia wymaga, żeby fallback w tym
  // widoku też się do tego stosował.
  const fetchPlaces = mock.fn(async () => [
    makeExternal({ externalId: "zakopane-1", title: "Krupówki", lat: 49.2992, lng: 19.9496 }),
  ]);

  const result = await resolveCategoryPlaces(curated, "Historia", { fetchPlaces });

  assert.ok(fetchPlaces.mock.callCount() > 0);
  assert.ok(
    !result.some((p) => p.title === "Krupówki"),
    "wynik spoza Wielkopolski/wybrzeża nie powinien trafić do listy",
  );
});

test("wyniki z Geoapify w tym widoku przechodzą przez filtr kategorii/nazw — odrzuca gabinet lekarski", async () => {
  const { resolveCategoryPlaces, MIN_CATEGORY_RESULTS } = await import("./getCategoryPlaces");
  const { geoapifyProvider } = await import("./placesProviders/geoapify");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/v2/places?")) {
      return new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                place_id: "doc1",
                name: "Dr Med. Edward Bieszka",
                lat: 52.45,
                lon: 17.0,
                country_code: "pl",
                categories: ["heritage", "building.historic", "healthcare", "healthcare.clinic_or_praxis"],
              },
            },
            {
              properties: {
                place_id: "castle1",
                name: "Zamek w Kaliszu",
                lat: 51.76,
                lon: 18.09,
                country_code: "pl",
                categories: ["tourism.sights", "tourism.sights.castle", "heritage"],
              },
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/v2/place-details")) {
      return new Response(JSON.stringify({ features: [{ properties: {} }] }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ features: [] }));
  }) as typeof fetch;

  try {
    const curated = Array.from({ length: MIN_CATEGORY_RESULTS - 2 }, () => makeCurated("Historia"));
    const result = await resolveCategoryPlaces(curated, "Historia", geoapifyProvider);

    assert.ok(
      !result.some((p) => p.title === "Dr Med. Edward Bieszka"),
      "gabinet lekarski nie powinien trafić do wyniku mimo pasującej kategorii heritage",
    );
    assert.ok(
      result.some((p) => p.title === "Zamek w Kaliszu"),
      "prawdziwa atrakcja turystyczna powinna zostać dodana",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("wyniki z Geoapify w tym widoku przechodzą przez filtr kategorii/nazw — odrzuca dzielnicę/miejscowość", async () => {
  const { resolveCategoryPlaces, MIN_CATEGORY_RESULTS } = await import("./getCategoryPlaces");
  const { geoapifyProvider } = await import("./placesProviders/geoapify");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/v2/places?")) {
      return new Response(
        JSON.stringify({
          features: [
            {
              properties: {
                place_id: "wrzeszcz1",
                name: "Wrzeszcz",
                lat: 52.5,
                lon: 17.6,
                country_code: "pl",
                categories: ["populated_place", "populated_place.suburb"],
              },
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      );
    }
    if (url.includes("/v2/place-details")) {
      return new Response(JSON.stringify({ features: [{ properties: {} }] }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ features: [] }));
  }) as typeof fetch;

  try {
    const curated = Array.from({ length: MIN_CATEGORY_RESULTS - 2 }, () => makeCurated("Historia"));
    const result = await resolveCategoryPlaces(curated, "Historia", geoapifyProvider);

    assert.ok(
      !result.some((p) => p.title === "Wrzeszcz"),
      "cała dzielnica/miejscowość nie powinna trafić do wyniku jako 'miejsce'",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
