import { test } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import {
  suggestBaseCandidates,
  nearbyPlacesWithDistance,
  restrictToSubRegion,
  previewPinsForSubRegion,
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

// Regresja zgłoszenia 05.09: Łeba (kuratorska, pełny opis redakcyjny)
// znikała z propozycji dla Środkowego wybrzeża tylko dlatego, że leżała
// ~27 km od już wybranego Rowy — mimo że to dwie różne, w pełni opisane
// kuratorskie miejscowości, nie duplikat tej samej okolicy. Kuratorskie
// miejsca NIE wykluczają się już nawzajem po odległości.
test("NIE odrzuca kuratorskiego kandydata tylko za to, że leży blisko innego już wybranego kuratorskiego miejsca", () => {
  // Prawdziwe współrzędne z bazy (patrz zgłoszenie): Rowy i Łeba, ~27 km
  // od siebie, obie kuratorskie, obie z wysoką gęstością sąsiadów.
  const rowy = makePlace({ slug: "rowy-jezioro-gardno", title: "Rowy i Jezioro Gardno", lat: 54.6875, lng: 17.1539 });
  const slowinski = makePlace({ slug: "slowinski-park-narodowy", title: "Słowiński Park Narodowy", lat: 54.7378, lng: 17.4611 });
  const leba = makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 });
  const bialogora = makePlace({ slug: "bialogora-krokowa", title: "Białogóra i Krokowa", lat: 54.7889, lng: 17.9833 });
  const ustka = makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 });

  const candidates = suggestBaseCandidates([rowy, slowinski, leba, bialogora, ustka], {
    interests: [],
    regionTypes: ["Morze"],
  });

  const slugs = candidates.map((c) => c.slug);
  assert.ok(
    slugs.includes("leba"),
    `Łeba powinna pojawić się jako propozycja obok Rowy, mimo bliskości (~27 km) — dostał: ${JSON.stringify(slugs)}`,
  );
  assert.ok(
    slugs.includes("rowy-jezioro-gardno"),
    `Rowy też powinno zostać zaproponowane — obie to różne, kuratorskie miejscowości: ${JSON.stringify(slugs)}`,
  );
});

test("miejsca 'basic' (Geoapify) nadal odrzucają kolejnego kandydata zbyt blisko już wybranej bazy", () => {
  const kuratorska = makePlace({
    slug: "ustka",
    title: "Ustka",
    lat: 54.5805,
    lng: 16.8614,
    source: "curated",
  });
  // Duplikat okolicy Ustki z Geoapify — ~5 km od kuratorskiej Ustki, więc
  // to TA SAMA okolica, nie druga, sensowna propozycja.
  const basicBliskoUstki = [
    makePlace({ slug: "geo-1", title: "Geoapify blisko", lat: 54.6, lng: 16.9, source: "basic" }),
    makePlace({ slug: "geo-2", title: "Geoapify blisko 2", lat: 54.62, lng: 16.95, source: "basic" }),
    makePlace({ slug: "geo-3", title: "Geoapify blisko 3", lat: 54.61, lng: 16.92, source: "basic" }),
  ];
  // Prawdziwie inna okolica z Geoapify, wystarczająco daleko (~70 km).
  const basicDaleko = makePlace({
    slug: "geo-daleko",
    title: "Geoapify daleko",
    lat: 54.79,
    lng: 17.6,
    source: "basic",
  });

  const candidates = suggestBaseCandidates([kuratorska, ...basicBliskoUstki, basicDaleko], {
    interests: [],
    regionTypes: ["Morze"],
  });

  const slugs = candidates.map((c) => c.slug);
  assert.ok(slugs.includes("ustka"), "kuratorska Ustka powinna zawsze się pojawić");
  assert.ok(
    slugs.includes("geo-daleko"),
    `propozycja z dala od Ustki powinna się pojawić jako uzupełnienie: ${JSON.stringify(slugs)}`,
  );
  assert.ok(
    !slugs.some((s) => s.startsWith("geo-") && s !== "geo-daleko"),
    `żadna propozycja "basic" blisko już wybranej Ustki nie powinna się pojawić: ${JSON.stringify(slugs)}`,
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

// Zgłoszenie 05.09, punkt 1: miniatura Poziomu 1 (wybór podregionu)
// pokazywała stałe kotwice z poland.ts — niezależne od tego, co faktycznie
// wychodziło z suggestBaseCandidates na liście niżej. previewPinsForSubRegion
// ma zamiast tego pokazywać prawdziwe kuratorskie miejsca z tego podregionu.
test("previewPinsForSubRegion zwraca prawdziwe kuratorskie miejsca (z tytułem) z granic podregionu, nie stałe kotwice", () => {
  const granice = { minLat: 54.4, maxLat: 54.87, minLng: 16.83, maxLng: 18.39 };
  const kotwice = [{ lat: 54.5805, lng: 16.8614 }]; // Ustka — fallback, nie powinien być użyty

  const wSrodkowym = makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 });
  const pozaSrodkowym = makePlace({ slug: "kolobrzeg", title: "Kołobrzeg", lat: 54.1752, lng: 15.5762 });

  const pins = previewPinsForSubRegion([wSrodkowym, pozaSrodkowym], granice, kotwice);

  assert.deepEqual(
    pins,
    [{ lat: 54.7597, lng: 17.5536, title: "Łeba" }],
    "powinien zwrócić Łebę z tytułem (w granicach), nie Kołobrzeg (poza) ani kotwicę fallback",
  );
});

test("previewPinsForSubRegion spada na kotwice (bez tytułu), gdy brak kuratorskich miejsc w granicach", () => {
  const granice = { minLat: 54.4, maxLat: 54.87, minLng: 16.83, maxLng: 18.39 };
  const kotwice = [{ lat: 54.5805, lng: 16.8614 }];

  const pins = previewPinsForSubRegion([], granice, kotwice);

  assert.deepEqual(
    pins,
    [{ lat: 54.5805, lng: 16.8614, title: "" }],
    "bez żadnych kuratorskich miejsc w granicach powinien użyć kotwic, ale bez zmyślonego tytułu",
  );
});

// Zgłoszenie 05.09 (kontynuacja): podpis pod miniaturą MUSI pochodzić z
// tych samych obiektów co pineski, żeby liczba wymienionych miejscowości
// nigdy nie mogła przekroczyć liczby pinesek — sprawdzane tu wprost na
// wyniku previewPinsForSubRegion, tej samej funkcji, która zasila mapę.
test("liczba tytułów z previewPinsForSubRegion nigdy nie przekracza liczby pinesek (ten sam obiekt zasila oba)", () => {
  const granice = { minLat: 54.4, maxLat: 54.87, minLng: 16.83, maxLng: 18.39 };
  const kotwice = [{ lat: 54.5805, lng: 16.8614 }];

  const miejsca = [
    makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 }),
    makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 }),
    makePlace({ slug: "rowy", title: "Rowy i Jezioro Gardno", lat: 54.6875, lng: 17.1539 }),
    makePlace({ slug: "bialogora", title: "Białogóra", lat: 54.7889, lng: 17.9833 }),
  ];

  const pins = previewPinsForSubRegion(miejsca, granice, kotwice, 3);
  const tytuly = pins.map((p) => p.title).filter(Boolean);

  assert.equal(pins.length, 3, "limit powinien ograniczyć liczbę pinesek");
  assert.equal(
    tytuly.length,
    pins.length,
    "liczba nazw dostępnych do podpisu musi się zgadzać z liczbą pinesek",
  );
});

// Zgłoszenie 05.09 (kontynuacja): "Słowiński Park Narodowy" pojawiał się
// jako propozycja BAZY wypadowej — błąd koncepcyjny, park narodowy to
// obszar chroniony bez noclegów, atrakcja do której się jedzie, nie
// miejscowość, z której się wyrusza.
test("park narodowy (tag 'Parki Narodowe') nigdy nie jest proponowany jako baza, nawet z najwyższą gęstością sąsiadów", () => {
  // Prawdziwe współrzędne z bazy — Słowiński PN faktycznie ma tu wysoką
  // gęstość (blisko Łeby i Rowów), więc bez filtra wygrałby ranking.
  const slowinski = makePlace({
    slug: "slowinski-park-narodowy",
    title: "Słowiński Park Narodowy",
    lat: 54.7378,
    lng: 17.4611,
    tags: ["Natura", "Aktywność fizyczna", "Parki Narodowe"],
  });
  const leba = makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 });
  const rowy = makePlace({ slug: "rowy", title: "Rowy i Jezioro Gardno", lat: 54.6875, lng: 17.1539 });

  const candidates = suggestBaseCandidates([slowinski, leba, rowy], {
    interests: [],
    regionTypes: ["Morze"],
  });

  const slugs = candidates.map((c) => c.slug);
  assert.ok(
    !slugs.includes("slowinski-park-narodowy"),
    `Park narodowy nie powinien nigdy pojawić się jako propozycja bazy: ${JSON.stringify(slugs)}`,
  );
  assert.ok(slugs.includes("leba"), "Łeba (prawdziwa miejscowość) powinna zostać zaproponowana");
});

test("park narodowy bez tagu, ale z 'Park Narodowy'/'Rezerwat przyrody' w nazwie (np. dane z Geoapify), też jest wykluczony z bycia bazą", () => {
  const rezerwat = makePlace({
    slug: "geo-rezerwat",
    title: "Rezerwat przyrody Beka",
    lat: 54.7,
    lng: 18.4,
    source: "basic",
    tags: [], // dane "basic" nie niosą naszego tagu "Parki Narodowe"
  });
  const miasteczko = makePlace({
    slug: "geo-miasto",
    title: "Jakieś miasteczko",
    lat: 54.71,
    lng: 18.41,
    source: "basic",
    tags: [],
  });

  const candidates = suggestBaseCandidates([rezerwat, miasteczko], {
    interests: [],
    regionTypes: ["Morze"],
  });

  const slugs = candidates.map((c) => c.slug);
  assert.ok(
    !slugs.includes("geo-rezerwat"),
    `Rezerwat przyrody (po nazwie, bez tagu) nie powinien pojawić się jako baza: ${JSON.stringify(slugs)}`,
  );
});

test("wykluczenie parku narodowego z bycia bazą NIE psuje jego wkładu w gęstość sąsiedniej, prawdziwej miejscowości", () => {
  const leba = makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 });
  const slowinski = makePlace({
    slug: "slowinski-park-narodowy",
    title: "Słowiński Park Narodowy",
    lat: 54.7378,
    lng: 17.4611,
    tags: ["Natura", "Aktywność fizyczna", "Parki Narodowe"],
  });
  // Trzecie miejsce w promieniu Łeby, żeby jej nearbyCount > 0 niezależnie
  // od parku — sprawdzamy, że PARK TEŻ się do tej liczby wlicza.
  const trzecie = makePlace({ slug: "trzecie", title: "Trzecie miejsce", lat: 54.75, lng: 17.5 });

  const candidates = suggestBaseCandidates([leba, slowinski, trzecie], {
    interests: [],
    regionTypes: ["Morze"],
  });

  const lebaCandidate = candidates.find((c) => c.slug === "leba");
  assert.ok(lebaCandidate, "Łeba powinna pojawić się jako propozycja");
  assert.equal(
    lebaCandidate!.nearbyCount,
    2,
    "gęstość Łeby powinna liczyć zarówno park narodowy, jak i trzecie miejsce — park odpada tylko z bycia SAMĄ bazą",
  );
});
