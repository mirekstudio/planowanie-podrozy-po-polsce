import { test } from "node:test";
import assert from "node:assert/strict";

// Klucz musi być ustawiony PRZED pierwszym (choćby pośrednim) importem
// geoapify.ts — moduł czyta go raz, do stałej na poziomie modułu, więc bez
// klucza fetchProtectedPlaces krótko spina się do pustej tablicy i żaden z
// testów poniżej niczego by nie dowiódł. Ten plik celowo NIE ma żadnego
// statycznego importu ./geoapify na górze (byłby hoistowany przed tę
// linię) — dynamiczny import() w każdym teście dociąga moduł dopiero tutaj.
process.env.GEOAPIFY_API_KEY = "test-key-do-zamockowanego-fetch";

// Dowód dla punktu 2 ścieżki naprawczej, część 2 (23.08): fetchProtectedPlaces
// to nowa, współdzielona funkcja niskiego poziomu (jedyne miejsce, które
// powinno rozmawiać z Geoapify /v2/places) — używana teraz zarówno przez
// generator tras/przeglądanie kategorii (przez fetchPlaces), jak i przez
// accommodation.ts. Te testy dowodzą, że jej trzy warstwy ochrony
// (country_code, filtr nieturystycznych wyników, zwracanie "categories")
// działają niezależnie od tego, kto ją wywołuje.

function mockFetchOnce(features: unknown[]) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/v2/places?")) {
      return new Response(JSON.stringify({ features }), {
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/v2/place-details")) {
      return new Response(JSON.stringify({ features: [{ properties: {} }] }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ features: [] }));
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("odrzuca wynik spoza Polski po country_code, mimo pasującej kategorii", async () => {
  const { fetchProtectedPlaces } = await import("./geoapify");
  const restore = mockFetchOnce([
    {
      properties: {
        place_id: "de1",
        name: "Schloss Berlin",
        lat: 52.52,
        lon: 13.405,
        country_code: "de",
        categories: ["tourism.sights.castle"],
      },
    },
  ]);
  try {
    const results = await fetchProtectedPlaces({
      categories: ["tourism.sights.castle"],
      center: { lat: 52.4064, lng: 16.9252 },
      radiusMeters: 55_000,
      limit: 10,
      exclude: [],
    });
    assert.equal(results.length, 0, "wynik z country_code != pl powinien zostać odrzucony");
  } finally {
    restore();
  }
});

test("odrzuca nieturystyczny wynik (gabinet lekarski) tym samym filtrem co generator tras", async () => {
  const { fetchProtectedPlaces } = await import("./geoapify");
  const restore = mockFetchOnce([
    {
      properties: {
        place_id: "doc1",
        name: "Dr Med. Edward Bieszka",
        lat: 52.45,
        lon: 17.0,
        country_code: "pl",
        categories: ["heritage", "healthcare", "healthcare.clinic_or_praxis"],
      },
    },
  ]);
  try {
    const results = await fetchProtectedPlaces({
      categories: ["heritage"],
      center: { lat: 52.4064, lng: 16.9252 },
      radiusMeters: 55_000,
      limit: 10,
      exclude: [],
    });
    assert.equal(results.length, 0, "gabinet lekarski nie powinien przejść przez wspólny filtr");
  } finally {
    restore();
  }
});

test("odrzuca wynik o tej samej nazwie co miejsce kuratorskie, nawet gdy leży daleko od jego współrzędnych (duplikat parku narodowego, zgłoszenie 23.08)", async () => {
  const { fetchProtectedPlaces } = await import("./geoapify");
  const restore = mockFetchOnce([
    {
      properties: {
        // Punkt reprezentacyjny Geoapify dla całego obszaru parku, ok. 15 km
        // od naszego kuratorskiego punktu (siedziba w Jeziorach) — za daleko
        // na sam filtr odległości (MIN_DISTANCE_FROM_CURATED_KM = 1 km), ale
        // to dokładnie ten sam, realny park.
        place_id: "wpn-geoapify",
        name: "Wielkopolski Park Narodowy",
        lat: 52.35,
        lon: 16.85,
        country_code: "pl",
        categories: ["national_park"],
      },
    },
  ]);
  try {
    const results = await fetchProtectedPlaces({
      categories: ["national_park"],
      center: { lat: 52.4064, lng: 16.9252 },
      radiusMeters: 85_000,
      limit: 10,
      exclude: [
        { lat: 52.268861, lng: 16.79725, title: "Wielkopolski Park Narodowy" },
      ],
    });
    assert.equal(
      results.length,
      0,
      "wynik o tej samej nazwie co miejsce kuratorskie powinien zostać odrzucony mimo dużej odległości",
    );
  } finally {
    restore();
  }
});

test("NIE odrzuca wyniku o innej nazwie, nawet gdy leży blisko listy wykluczeń po samej nazwie (kontrola negatywna)", async () => {
  const { fetchProtectedPlaces } = await import("./geoapify");
  const restore = mockFetchOnce([
    {
      properties: {
        place_id: "wpn-real-2",
        name: "Drawieński Park Narodowy",
        lat: 53.0,
        lon: 15.8,
        country_code: "pl",
        categories: ["national_park"],
      },
    },
  ]);
  try {
    const results = await fetchProtectedPlaces({
      categories: ["national_park"],
      center: { lat: 52.4064, lng: 16.9252 },
      radiusMeters: 85_000,
      limit: 10,
      exclude: [
        { lat: 52.268861, lng: 16.79725, title: "Wielkopolski Park Narodowy" },
      ],
    });
    assert.equal(results.length, 1, "inny, naprawdę odrębny park nie powinien zostać odrzucony");
    assert.equal(results[0].title, "Drawieński Park Narodowy");
  } finally {
    restore();
  }
});

test("przepuszcza prawdziwą atrakcję i zwraca jej surowe kategorie (potrzebne dla accommodation.ts)", async () => {
  const { fetchProtectedPlaces } = await import("./geoapify");
  const restore = mockFetchOnce([
    {
      properties: {
        place_id: "hotel1",
        name: "Hotel Pod Lipami",
        lat: 52.41,
        lon: 16.93,
        country_code: "pl",
        categories: ["accommodation", "accommodation.hotel"],
      },
    },
  ]);
  try {
    const results = await fetchProtectedPlaces({
      categories: ["accommodation.hotel"],
      center: { lat: 52.4064, lng: 16.9252 },
      radiusMeters: 20_000,
      limit: 5,
      exclude: [],
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Hotel Pod Lipami");
    assert.deepEqual(results[0].categories, ["accommodation", "accommodation.hotel"]);
  } finally {
    restore();
  }
});

test("bez klucza API zwraca pustą tablicę, nie rzuca wyjątku", async () => {
  const { fetchProtectedPlaces } = await import("./geoapify");
  const originalKey = process.env.GEOAPIFY_API_KEY;
  // Uwaga: GEOAPIFY_API_KEY w geoapify.ts jest już wczytany do stałej modułu
  // przy pierwszym imporcie (na górze tego pliku) — ten test nie może więc
  // dowieść zachowania "brak klucza od startu" (do tego służy osobny,
  // pierwszy test w getCategoryPlaces.test.ts). Dowodzi za to, że
  // fetchProtectedPlaces nie rzuca, gdy fetch w ogóle się nie wykona —
  // symulowane przez sieć zwracającą błąd.
  const restore = (() => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("sieć niedostępna");
    }) as typeof fetch;
    return () => {
      globalThis.fetch = orig;
    };
  })();
  try {
    const results = await fetchProtectedPlaces({
      categories: ["tourism.sights"],
      center: { lat: 52.4064, lng: 16.9252 },
      radiusMeters: 20_000,
      limit: 5,
      exclude: [],
    });
    assert.deepEqual(results, []);
  } finally {
    restore();
    process.env.GEOAPIFY_API_KEY = originalKey;
  }
});
