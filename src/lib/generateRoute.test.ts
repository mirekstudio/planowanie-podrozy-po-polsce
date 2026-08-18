import { test } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import { generateRouteVariants } from "./generateRoute";
import { COASTAL_SUB_REGIONS, isWithinBounds, type Bounds } from "./poland";

// Testy "z dowodami" (współrzędne, nie tylko podgląd na mapie) dla
// strażnika granic podregionów wybrzeża — patrz enforceSubRegionBounds w
// generateRoute.ts i notatka w planie naprawczym ("Testować z dowodami
// (współrzędne/nazwy punktów), nie tylko wizualnie na mapie"). Poprzednie
// 3 próby naprawy tego dokładnego problemu (punkty regionu "Morze" poza
// granicami) były sprawdzane tylko wizualnie — stąd ten plik.

let placeCounter = 0;

function makePlace(overrides: Partial<Place> & { lat: number; lng: number }): Place {
  placeCounter += 1;
  return {
    slug: `test-place-${placeCounter}`,
    title: `Testowe miejsce ${placeCounter}`,
    region: "Test",
    description: "Opis testowy",
    longDescription: "Opis testowy",
    image: "",
    imageAlt: "",
    credit: { author: "Test", license: "CC0" },
    sortOrder: placeCounter,
    tags: ["Natura"],
    source: "curated",
    regionType: ["Morze"],
    surroundings: [],
    nearbyAttraction: null,
    recommendedCampsites: [],
    culinaryTip: null,
    featured: false,
    ...overrides,
  };
}

function boundsFor(id: string): Bounds {
  const sub = COASTAL_SUB_REGIONS.find((s) => s.id === id);
  if (!sub) throw new Error(`Nieznany podregion: ${id}`);
  return sub.bounds;
}

// Prawdziwe współrzędne z bazy kuratorskiej (supabase/add_*_coast_places.sql,
// supabase/add_coastal_places.sql) — te same dane, które faktycznie widzi
// appka na produkcji, żeby test nie sprawdzał tylko sztucznych danych
// wymyślonych pod sam test.
const CURATED_COASTAL: Place[] = [
  makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 }),
  makePlace({
    slug: "slowinski-park-narodowy",
    title: "Słowiński Park Narodowy",
    lat: 54.7378,
    lng: 17.4611,
  }),
  makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 }),
  makePlace({
    slug: "swinoujscie",
    title: "Świnoujście, Międzyzdroje i Wolin",
    lat: 53.9283,
    lng: 14.4506,
  }),
  makePlace({
    slug: "kolobrzeg",
    title: "Kołobrzeg i Dźwirzyno",
    lat: 54.1752,
    lng: 15.5762,
  }),
  makePlace({
    slug: "wladyslawowo",
    title: "Władysławowo i Półwysep Helski",
    lat: 54.6053,
    lng: 18.8028,
  }),
  makePlace({ slug: "trojmiasto", title: "Trójmiasto", lat: 54.4431, lng: 18.5614 }),
  makePlace({
    slug: "mierzeja-wislana",
    title: "Mierzeja Wiślana",
    lat: 54.3833,
    lng: 19.45,
  }),
];

// Symuluje dokładnie ten typ błędu, który appka miała wcześniej: miejsce
// "podstawowe" (Geoapify) otagowane (przez dedupeAcrossSubRegions /
// toBasicPlace w getRoutePlaces.ts) jako należące do jednego podregionu, ale
// którego RZECZYWISTE współrzędne leżą w zupełnie innym miejscu — np. przez
// błąd w przypisaniu kotwicy albo w samych danych źródłowych.
const MISTAGGED_BASIC: Place = makePlace({
  slug: "geoapify-mistagged",
  title: "Błędnie otagowane miejsce (Trójmiasto pod flagą zachodniego wybrzeża)",
  lat: 54.4431, // faktycznie Trójmiasto — należy do wschodnie-wybrzeze
  lng: 18.5614,
  region: "zachodnie-wybrzeze", // ale otagowane jako zachodnie wybrzeże
  source: "basic",
});

// Symuluje POI zwrócone przez zewnętrznego dostawcę z totalnie błędnymi
// współrzędnymi (np. błąd geokodowania) — poza jakimkolwiek podregionem
// wybrzeża, a nawet poza Polską.
const WILDLY_WRONG_BASIC: Place = makePlace({
  slug: "geoapify-wrong-coords",
  title: "Miejsce z błędnymi współrzędnymi (Berlin)",
  lat: 52.52,
  lng: 13.405,
  region: "srodkowe-wybrzeze",
  source: "basic",
});

const ALL_PLACES: Place[] = [...CURATED_COASTAL, MISTAGGED_BASIC, WILDLY_WRONG_BASIC];

test("każdy przystanek każdego wariantu Morza leży w granicach SWOJEGO podregionu (2 dni)", () => {
  assertAllStopsWithinDeclaredBounds(2);
});

test("każdy przystanek każdego wariantu Morza leży w granicach SWOJEGO podregionu (7 dni)", () => {
  assertAllStopsWithinDeclaredBounds(7);
});

test("każdy przystanek każdego wariantu Morza leży w granicach SWOJEGO podregionu (14 dni, pula wyczerpana)", () => {
  // Dużo dni przy małej puli testowych miejsc wymusza sytuację, w której
  // enforceSubRegionBounds może zabraknąć zamienników — sprawdzamy, że w
  // takim wypadku miejsce jest PO PROSTU USUWANE, a nie akceptowane mimo
  // złych współrzędnych (patrz komentarz przy enforceSubRegionBounds).
  assertAllStopsWithinDeclaredBounds(14);
});

function assertAllStopsWithinDeclaredBounds(days: number) {
  const variants = generateRouteVariants(ALL_PLACES, {
    days,
    interests: [],
    regionTypes: ["Morze"],
  });

  assert.ok(variants.length > 0, "powinien powstać przynajmniej jeden wariant");

  for (const variant of variants) {
    const bounds = boundsFor(variant.id);
    for (const stop of variant.route.stops) {
      assert.ok(
        isWithinBounds(stop, bounds),
        `Przystanek "${stop.title}" (${stop.lat}, ${stop.lng}, slug=${stop.slug}) ` +
          `wypadł POZA granicami wariantu "${variant.id}" (${JSON.stringify(bounds)}) ` +
          `przy days=${days}.`,
      );
    }
  }
}

test("błędnie otagowane/błędne współrzędne nigdy nie trafiają do żadnego wariantu", () => {
  const variants = generateRouteVariants(ALL_PLACES, {
    days: 10,
    interests: [],
    regionTypes: ["Morze"],
  });

  const allStopSlugs = variants.flatMap((v) => v.route.stops.map((s) => s.slug));
  assert.ok(
    !allStopSlugs.includes(MISTAGGED_BASIC.slug),
    "błędnie otagowane miejsce (prawdziwe współrzędne w innym podregionie) nie powinno pojawić się w żadnym wariancie pod swoim błędnym tagiem",
  );
  assert.ok(
    !allStopSlugs.includes(WILDLY_WRONG_BASIC.slug),
    "miejsce z całkowicie błędnymi współrzędnymi (Berlin) nigdy nie powinno pojawić się w wygenerowanej trasie",
  );
});

test("żaden przystanek nie powtarza się w obrębie jednego wariantu (regresja: duplikat na styku podregionów)", () => {
  const variants = generateRouteVariants(ALL_PLACES, {
    days: 10,
    interests: [],
    regionTypes: ["Morze"],
  });

  for (const variant of variants) {
    const slugs = variant.route.stops.map((s) => s.slug);
    const unique = new Set(slugs);
    assert.equal(
      unique.size,
      slugs.length,
      `Wariant "${variant.id}" zawiera zduplikowany przystanek: ${JSON.stringify(slugs)}`,
    );
  }
});
