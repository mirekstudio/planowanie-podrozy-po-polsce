import { test } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import {
  suggestBaseCandidates,
  nearbyPlacesWithDistance,
  restrictToSubRegion,
} from "./suggestBases";

// Dowód, że suggestBaseCandidates NIGDY nie korzysta z generateRoute.ts —
// patrz komentarz w suggestBases.ts. Testy sprawdzają tylko własną logikę
// (gęstość + minimalna odległość między bazami), bez importu generateRoute/
// generateRouteVariants/orderByProximity w tym pliku w ogóle.

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

test("wybiera jako bazę miejsce z największą gęstością pobliskich miejsc, nie pierwsze z brzegu", () => {
  // Gęsty klaster wokół Ustki (5 miejsc w promieniu ~10 km).
  const gesty = [
    makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 }),
    makePlace({ slug: "rowy", title: "Rowy", lat: 54.65, lng: 17.0 }),
    makePlace({ slug: "duninowo", title: "Duninowo", lat: 54.62, lng: 16.95 }),
    makePlace({ slug: "orzechowo", title: "Orzechowo", lat: 54.6, lng: 16.9 }),
    makePlace({ slug: "objazda", title: "Objazda", lat: 54.63, lng: 16.88 }),
  ];
  // Odosobnione miejsce daleko od wszystkiego (Świnoujście, >150 km).
  const samotne = makePlace({
    slug: "swinoujscie",
    title: "Świnoujście",
    lat: 53.9099,
    lng: 14.2477,
  });

  const candidates = suggestBaseCandidates([...gesty, samotne], {
    interests: [],
    regionTypes: ["Morze"],
  });

  assert.ok(candidates.length >= 1);
  assert.equal(
    candidates[0].slug,
    "ustka",
    `Pierwszą propozycją powinna być Ustka (najgęstszy klaster), a wyszło "${candidates[0].title}"`,
  );
  assert.ok(
    candidates[0].nearbyCount >= 4,
    "Ustka powinna mieć co najmniej 4 sąsiadów w promieniu 30 km",
  );
});

test("odrzuca kolejnego kandydata zbyt blisko już wybranej bazy (nie proponuje dwa razy tej samej okolicy)", () => {
  const ustka = makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 });
  // Duplikat okolicy Ustki — gęsty klaster, ale ~5 km od Ustki, więc to
  // TA SAMA okolica, nie druga, sensowna propozycja.
  const bliskoUstki = [
    makePlace({ slug: "ustka-2", title: "Ustka-2", lat: 54.6, lng: 16.9 }),
    makePlace({ slug: "rowy", title: "Rowy", lat: 54.62, lng: 16.95 }),
    makePlace({ slug: "duninowo", title: "Duninowo", lat: 54.61, lng: 16.92 }),
    makePlace({ slug: "orzechowo", title: "Orzechowo", lat: 54.63, lng: 16.88 }),
  ];
  // Prawdziwie inna okolica, wystarczająco daleko (Łeba, ~70 km).
  const leba = [
    makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 }),
    makePlace({ slug: "karwia", title: "Karwia", lat: 54.79, lng: 17.6 }),
  ];

  const candidates = suggestBaseCandidates([ustka, ...bliskoUstki, ...leba], {
    interests: [],
    regionTypes: ["Morze"],
  });

  const slugs = candidates.map((c) => c.slug);
  assert.ok(
    slugs.includes("leba") || slugs.includes("karwia"),
    `Powinna pojawić się propozycja z okolicy Łeby jako druga, różna baza — dostał: ${JSON.stringify(slugs)}`,
  );
  // Nie może zaproponować zarówno Ustki, jak i Ustki-2 — to duplikat okolicy.
  assert.ok(
    !(slugs.includes("ustka") && slugs.includes("ustka-2")),
    `Nie powinien zaproponować dwóch baz z tej samej, bliskiej okolicy: ${JSON.stringify(slugs)}`,
  );
});

test("nearbyPlacesWithDistance zwraca miejsca w promieniu z policzonym dystansem, posortowane od najbliższego, bez samej bazy", () => {
  const baza = makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 });
  const bliskie = makePlace({ slug: "rowy", title: "Rowy", lat: 54.6, lng: 16.9 });
  const dalsze = makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 });
  const bardzoDaleko = makePlace({
    slug: "swinoujscie",
    title: "Świnoujście",
    lat: 53.9099,
    lng: 14.2477,
  });

  const nearby = nearbyPlacesWithDistance([baza, bliskie, dalsze, bardzoDaleko], baza, 30);

  assert.deepEqual(
    nearby.map((n) => n.place.slug),
    ["rowy"],
    "w promieniu 30 km od Ustki powinno być tylko Rowy — nie sama baza, nie odległe miejsca",
  );
  assert.ok(
    nearby[0].distanceKm > 0 && nearby[0].distanceKm < 30,
    "dystans do Rowów powinien być policzony i mieścić się w promieniu",
  );
});

test("nearbyPlacesWithDistance przy większym promieniu (suwak) zwraca więcej miejsc, bez ponownego przeliczania odległości", () => {
  const baza = makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 });
  const bliskie = makePlace({ slug: "rowy", title: "Rowy", lat: 54.6, lng: 16.9 });
  const dalsze = makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 });

  // Liczone RAZ do maksymalnego promienia (symulacja tego, co robi
  // /planer/baza przed przekazaniem do klienta) — kolejne promienie tylko
  // filtrują tę samą listę, tak jak BaseRadiusExplorer.tsx po stronie klienta.
  const wszystkie = nearbyPlacesWithDistance([baza, bliskie, dalsze], baza, 50);

  const przy15km = wszystkie.filter((n) => n.distanceKm <= 15);
  const przy50km = wszystkie.filter((n) => n.distanceKm <= 50);

  assert.deepEqual(przy15km.map((n) => n.place.slug), ["rowy"]);
  assert.deepEqual(przy50km.map((n) => n.place.slug), ["rowy", "leba"]);
});

test("restrictToSubRegion ogranicza pulę do jednego podregionu wybrzeża po tagu (basic) i po odległości od kotwic (kuratorskie)", () => {
  const kotwiceSrodkowego = [
    { lat: 54.5805, lng: 16.8614 }, // Ustka
    { lat: 54.7597, lng: 17.5536 }, // Łeba
  ];
  const granice = { minLat: 54.4, maxLat: 54.87, minLng: 16.83, maxLng: 18.39 };

  const bazowyWSrodkowym = makePlace({
    slug: "rowy",
    title: "Rowy",
    lat: 54.6,
    lng: 16.9,
    source: "curated",
  });
  const bazowyDaleko = makePlace({
    slug: "swinoujscie",
    title: "Świnoujście",
    lat: 53.9099,
    lng: 14.2477,
    source: "curated",
  });
  const basicOtagowanySrodkowy = makePlace({
    slug: "geoapify-cos",
    title: "Coś z Geoapify",
    lat: 54.65,
    lng: 17.0,
    source: "basic",
    region: "srodkowe-wybrzeze",
  });
  const basicOtagowanyInny = makePlace({
    slug: "geoapify-cos-innego",
    title: "Coś innego z Geoapify",
    lat: 54.65,
    lng: 17.0, // fizycznie blisko, ale otagowane jako inny podregion
    source: "basic",
    region: "zachodnie-wybrzeze",
  });

  const result = restrictToSubRegion(
    [bazowyWSrodkowym, bazowyDaleko, basicOtagowanySrodkowy, basicOtagowanyInny],
    "srodkowe-wybrzeze",
    kotwiceSrodkowego,
    granice,
  );

  const slugs = result.map((p) => p.slug);
  assert.ok(slugs.includes("rowy"), "kuratorskie miejsce blisko kotwic podregionu powinno przejść");
  assert.ok(!slugs.includes("swinoujscie"), "kuratorskie miejsce daleko od kotwic nie powinno przejść");
  assert.ok(
    slugs.includes("geoapify-cos"),
    "miejsce 'basic' otagowane właściwym podregionem powinno przejść",
  );
  assert.ok(
    !slugs.includes("geoapify-cos-innego"),
    "miejsce 'basic' otagowane INNYM podregionem nie powinno przejść, nawet gdy fizycznie blisko",
  );
});

// Realny przypadek z live-testu 05.09: promień 120 km wokół kotwic
// Środkowego wybrzeża (Ustka/Łeba) sam w sobie łapał Kołobrzeg — kotwicę
// SĄSIEDNIEGO, Zachodniego wybrzeża, leżącą ~94 km od Ustki. Bez twardej
// granicy `bounds` appka pokazywałaby Kołobrzeg jako propozycję bazy w
// "Środkowym wybrzeżu", mimo że to inny odcinek.
test("restrictToSubRegion odrzuca kuratorskie miejsce w promieniu kotwic, ale POZA twardą granicą podregionu (kotwica sąsiedniego odcinka)", () => {
  const kotwiceSrodkowego = [
    { lat: 54.5805, lng: 16.8614 }, // Ustka
    { lat: 54.7597, lng: 17.5536 }, // Łeba
    { lat: 54.8289, lng: 18.21 }, // Karwia
  ];
  const graniceSrodkowego = { minLat: 54.4, maxLat: 54.87, minLng: 16.83, maxLng: 18.39 };

  const kolobrzeg = makePlace({
    slug: "kolobrzeg",
    title: "Kołobrzeg i Dźwirzyno",
    lat: 54.1752,
    lng: 15.5762,
    source: "curated",
  });

  const result = restrictToSubRegion(
    [kolobrzeg],
    "srodkowe-wybrzeze",
    kotwiceSrodkowego,
    graniceSrodkowego,
  );

  assert.deepEqual(
    result,
    [],
    "Kołobrzeg (kotwica Zachodniego wybrzeża) nie powinien pojawić się jako propozycja dla Środkowego wybrzeża",
  );
});
