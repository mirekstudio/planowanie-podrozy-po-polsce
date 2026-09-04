import { test } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import { generateRoute, generateRouteVariants } from "./generateRoute";
import {
  COASTAL_SUB_REGIONS,
  WIELKOPOLSKA_REGION,
  isWithinBounds,
  type Bounds,
} from "./poland";

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

// Testy "z dowodami" dla uproszczenia architektury (usunięcie punktu
// startowego z generowania trasy, zgłoszenie: "wybór punktu startowego
// przenosimy na etap 'Start — nawiguj'"): generowanie trasy nie przyjmuje
// już w ogóle punktu startowego użytkownika (patrz RouteOptions w
// generateRoute.ts), więc algorytm sortowania musi sam wybrać sensowny
// geograficzny punkt "wjazdu" w region — sprawdzamy, że faktycznie to
// robi (dystans do stałej kotwicy), a nie że po prostu bierze pierwsze z
// brzegu miejsce po sortOrder (stare zachowanie sprzed tej zmiany).
test("bez wybranego typu regionu trasa zaczyna się od miejsca najbliższego Poznaniu (brama Wielkopolski), nie od miejsca z najniższym sortOrder", () => {
  const daleko = makePlace({
    slug: "daleko-od-poznania",
    title: "Daleko od Poznania",
    lat: 49.3,
    lng: 19.95,
    tags: ["Historia"],
    regionType: [],
    sortOrder: 1, // celowo "najlepszy" sortOrder — wygrałby w starej logice
  });
  const blisko = makePlace({
    slug: "blisko-poznania",
    title: "Blisko Poznania",
    lat: WIELKOPOLSKA_REGION.anchors[0].lat + 0.05,
    lng: WIELKOPOLSKA_REGION.anchors[0].lng + 0.05,
    tags: ["Historia"],
    regionType: [],
    sortOrder: 99, // celowo "najgorszy" sortOrder — przegrałby w starej logice
  });

  const route = generateRoute([daleko, blisko], { days: 3, interests: [] });

  assert.equal(
    route.stops[0]?.slug,
    "blisko-poznania",
    `Pierwszy przystanek powinien być geograficznie najbliżej Poznania, ` +
      `a wyszedł "${route.stops[0]?.title}" (sortOrder=${route.stops[0]?.sortOrder}).`,
  );
});

test("w klastrze wybrzeża pierwszy przystanek jest najbliżej WŁASNEJ kotwicy tego klastra (Jarosławiec), a nie miejsca z najniższym sortOrder", () => {
  const jaroslawiecAnchor = COASTAL_SUB_REGIONS.find(
    (s) => s.id === "zachodnie-wybrzeze",
  )!.anchors[2]; // Jarosławiec — trzecia kotwica zachodniego wybrzeża

  const koloJaroslawca = makePlace({
    slug: "kolo-jaroslawca",
    title: "Tuż przy Jarosławcu",
    lat: jaroslawiecAnchor.lat,
    lng: jaroslawiecAnchor.lng,
    source: "basic",
    region: "zachodnie-wybrzeze",
    regionType: ["Morze"],
    sortOrder: 99, // celowo "najgorszy" sortOrder
  });
  const koloUstki = makePlace({
    slug: "kolo-ustki",
    title: "Tuż przy Ustce",
    lat: 54.5805,
    lng: 16.8614,
    source: "basic",
    region: "zachodnie-wybrzeze",
    regionType: ["Morze"],
    sortOrder: 1, // celowo "najlepszy" sortOrder — wygrałby w starej logice
  });

  const variants = generateRouteVariants([koloJaroslawca, koloUstki], {
    days: 3, // 3 dni na 3 kotwice zachodniego wybrzeża = po 1 dniu na klaster
    interests: [],
    regionTypes: ["Morze"],
  });

  const zachodniWariant = variants.find((v) => v.id === "zachodnie-wybrzeze");
  assert.ok(zachodniWariant, "powinien powstać wariant zachodniego wybrzeża");
  assert.equal(
    zachodniWariant!.route.stops[0]?.slug,
    "kolo-jaroslawca",
    `Pierwszy przystanek klastra Jarosławiec powinien być najbliżej JEGO ` +
      `własnej kotwicy, a wyszedł "${zachodniWariant!.route.stops[0]?.title}".`,
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
