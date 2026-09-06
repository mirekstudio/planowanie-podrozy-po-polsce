import { test } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import type { Nocleg } from "@/data/noclegi";
import {
  suggestBaseCandidates,
  nearbyPlacesWithDistance,
  restrictToSubRegion,
  pinsFromBaseCandidates,
  functionsAsHotel,
} from "./suggestBases";

function makeNocleg(overrides: Partial<Nocleg> & { lat: number; lng: number }): Nocleg {
  return {
    id: `test-nocleg-${overrides.lat}-${overrides.lng}`,
    nazwa: "Testowy nocleg",
    typ: "kemping",
    miejscePowiazane: null,
    udogodnienia: null,
    poziomKomfortu: null,
    link: null,
    ...overrides,
  };
}

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
// wychodziło z suggestBaseCandidates na liście niżej.
//
// Zgłoszenie 05.09 (trzecia kontynuacja): sama zamiana kotwic na realne
// miejsca to było za mało — previewPinsForSubRegion nadal SAMA dobierała
// (i limitowała do 3, i filtrowała parki) niezależnie od
// suggestBaseCandidates, czyli był to trzeci, osobny dobór tego samego
// zbioru miejsc, który mógł się rozjechać z Poziomem 2. Naprawa: funkcja
// (przemianowana na pinsFromBaseCandidates) nie dobiera już NICZEGO sama
// — przyjmuje gotowe BaseCandidate[] z suggestBaseCandidates i mapuje
// WSZYSTKIE (bez limitu) na piny, więc Poziom 1 pokazuje dokładnie to
// samo, w tej samej liczbie, co pełna lista kart Poziomu 2.
test("pinsFromBaseCandidates mapuje WSZYSTKICH kandydatów na bazę na piny z tytułem, bez żadnego limitu", () => {
  const kotwice = [{ lat: 54.5805, lng: 16.8614 }]; // fallback, nie powinien być użyty

  // 4 różne, kuratorskie miejscowości — tyle, ile MAX_BASE_CANDIDATES
  // pozwala zwrócić naraz z suggestBaseCandidates. Dawny domyślny limit=3
  // previewPinsForSubRegion obciąłby to do 3 — pinsFromBaseCandidates nie
  // może obcinać niczego, bo dobór już się skończył w suggestBaseCandidates.
  const miejsca = [
    makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 }),
    makePlace({ slug: "ustka", title: "Ustka", lat: 54.5805, lng: 16.8614 }),
    makePlace({ slug: "rowy", title: "Rowy i Jezioro Gardno", lat: 54.6875, lng: 17.1539 }),
    makePlace({ slug: "bialogora", title: "Białogóra", lat: 54.7889, lng: 17.9833 }),
  ];

  const candidates = suggestBaseCandidates(miejsca, { interests: [], regionTypes: ["Morze"] });
  const pins = pinsFromBaseCandidates(candidates, kotwice);

  assert.equal(candidates.length, 4, "kontrola: suggestBaseCandidates powinno zwrócić wszystkie 4 miejscowości");
  assert.equal(pins.length, 4, "pinsFromBaseCandidates nie może obcinać listy kandydatów");
  assert.deepEqual(
    new Set(pins.map((p) => p.title)),
    new Set(candidates.map((c) => c.title)),
    "piny muszą wymieniać dokładnie te same miejsca co kandydaci na bazę",
  );
  for (const pin of pins) {
    const candidate = candidates.find((c) => c.title === pin.title)!;
    assert.equal(pin.lat, candidate.lat, "współrzędne pineska muszą pochodzić z tego samego kandydata");
    assert.equal(pin.lng, candidate.lng);
  }
});

test("pinsFromBaseCandidates spada na kotwice (bez tytułu), gdy suggestBaseCandidates nie zwróciło żadnego kandydata", () => {
  const kotwice = [{ lat: 54.5805, lng: 16.8614 }];

  const pins = pinsFromBaseCandidates([], kotwice);

  assert.deepEqual(
    pins,
    [{ lat: 54.5805, lng: 16.8614, title: "", icon: "📍" }],
    "bez żadnych kandydatów powinien użyć kotwic, ale bez zmyślonego tytułu",
  );
});

// Zgłoszenie 05.09 (kontynuacja druga i trzecia): "Słowiński Park
// Narodowy" nie może się pojawić na Poziomie 1 jako reprezentatywny
// pinesek/nazwa podregionu — sprawdzone tu jako test integracyjny całego
// łańcucha, którego Poziom 1 faktycznie teraz używa (suggestBaseCandidates
// → pinsFromBaseCandidates), a nie osobnego, potencjalnie niespójnego
// filtra.
test("łańcuch suggestBaseCandidates → pinsFromBaseCandidates nigdy nie pokazuje parku narodowego jako pineska Poziomu 1", () => {
  const kotwice = [{ lat: 54.5805, lng: 16.8614 }];

  // Te same prawdziwe współrzędne Słowińskiego PN co w testach
  // suggestBaseCandidates niżej.
  const slowinski = makePlace({
    slug: "slowinski-park-narodowy",
    title: "Słowiński Park Narodowy",
    lat: 54.7378,
    lng: 17.4611,
    tags: ["Natura", "Aktywność fizyczna", "Parki Narodowe"],
  });
  const leba = makePlace({ slug: "leba", title: "Łeba", lat: 54.7597, lng: 17.5536 });
  const rowy = makePlace({ slug: "rowy", title: "Rowy i Jezioro Gardno", lat: 54.6875, lng: 17.1539 });

  const candidates = suggestBaseCandidates([slowinski, leba, rowy], { interests: [], regionTypes: ["Morze"] });
  const pins = pinsFromBaseCandidates(candidates, kotwice);
  const tytuly = pins.map((p) => p.title);

  assert.ok(
    !tytuly.includes("Słowiński Park Narodowy"),
    `Park narodowy nie powinien pojawić się w podglądzie Poziomu 1: ${JSON.stringify(tytuly)}`,
  );
  assert.ok(tytuly.includes("Łeba"), "Łeba (prawdziwa miejscowość, kandydatka na bazę) powinna zostać w podglądzie");
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

// ---------------------------------------------------------------------------
// Zgłoszenie 06.09: kryteria jakości bazy wypadowej (nocleg, centralność,
// różnorodność) — trzy scenariusze niżej, każdy izoluje JEDNO kryterium,
// trzymając pozostałe (gęstość, geometria) identyczne między porównywanymi
// kandydatami, żeby zmiana rankingu dowodziła konkretnie tego jednego
// mechanizmu, nie przypadkowego efektu ubocznego.
//
// Wspólny szkielet geometryczny: dwie "miejscowości" (kandydaci na bazę),
// symetrycznie oddalone od punktu (54.0, 18.0) o 0.6° długości geogr.
// (~78 km od siebie, bezpiecznie ponad BASE_SEARCH_RADIUS_KM=30 km — nie
// liczą się nawzajem jako sąsiedzi). Każda ma własnych DWÓCH sąsiadów
// przesuniętych o 0.16° szerokości (~17.8 km — w promieniu 30 km od
// "swojej" miejscowości, ale >30 km od siebie nawzajem, więc nie liczą się
// jako sąsiedzi MIĘDZY sobą) — dzięki temu każda miejscowość ma
// jednoznacznie najwyższą gęstość (2) w swoim lokalnym klastrze, bez remisu
// z własnymi sąsiadami.

test("kryterium 'realna infrastruktura noclegowa': przy identycznej gęstości i różnorodności wygrywa miejscowość z potwierdzonym noclegiem", () => {
  const zNoclegiem = makePlace({
    slug: "z-noclegiem",
    title: "Z noclegiem",
    lat: 54.0,
    lng: 17.4,
    tags: ["Zamki i Pałace"],
    recommendedCampsites: ["Kemping Testowy"],
  });
  const sasiedziA = [
    makePlace({ slug: "a1", title: "A1", lat: 54.16, lng: 17.4, tags: ["Historia"] }),
    makePlace({ slug: "a2", title: "A2", lat: 53.84, lng: 17.4, tags: ["Historia"] }),
  ];
  const bezNoclegu = makePlace({
    slug: "bez-noclegu",
    title: "Bez noclegu",
    lat: 54.0,
    lng: 18.6,
    tags: ["Zamki i Pałace"],
    recommendedCampsites: [],
  });
  const sasiedziB = [
    makePlace({ slug: "b1", title: "B1", lat: 54.16, lng: 18.6, tags: ["Historia"] }),
    makePlace({ slug: "b2", title: "B2", lat: 53.84, lng: 18.6, tags: ["Historia"] }),
  ];

  const candidates = suggestBaseCandidates(
    [zNoclegiem, ...sasiedziA, bezNoclegu, ...sasiedziB],
    { interests: [], regionTypes: ["Morze"] },
    [], // brak tabeli `noclegi` — jedynym sygnałem jest recommendedCampsites
  );

  const slugs = candidates.map((c) => c.slug);
  const idxZ = slugs.indexOf("z-noclegiem");
  const idxBez = slugs.indexOf("bez-noclegu");
  assert.ok(idxZ !== -1 && idxBez !== -1, `obie miejscowości powinny się pojawić: ${JSON.stringify(slugs)}`);
  assert.ok(
    idxZ < idxBez,
    `przy tej samej gęstości i różnorodności "Z noclegiem" powinno wyprzedzić "Bez noclegu": ${JSON.stringify(slugs)}`,
  );
});

test("kryterium 'realna infrastruktura noclegowa': tabela noclegi (po współrzędnych, nie po polu miejscePowiazane) też liczy się jako potwierdzony nocleg", () => {
  const zNoclegiem = makePlace({
    slug: "z-noclegiem-tabela",
    title: "Z noclegiem z tabeli",
    lat: 54.0,
    lng: 17.4,
    tags: ["Zamki i Pałace"],
    recommendedCampsites: [], // celowo puste — sygnał ma przyjść WYŁĄCZNIE z tabeli noclegi
  });
  const sasiedziA = [
    makePlace({ slug: "at1", title: "AT1", lat: 54.16, lng: 17.4, tags: ["Historia"] }),
    makePlace({ slug: "at2", title: "AT2", lat: 53.84, lng: 17.4, tags: ["Historia"] }),
  ];
  const bezNoclegu = makePlace({
    slug: "bez-noclegu-tabela",
    title: "Bez noclegu z tabeli",
    lat: 54.0,
    lng: 18.6,
    tags: ["Zamki i Pałace"],
    recommendedCampsites: [],
  });
  const sasiedziB = [
    makePlace({ slug: "bt1", title: "BT1", lat: 54.16, lng: 18.6, tags: ["Historia"] }),
    makePlace({ slug: "bt2", title: "BT2", lat: 53.84, lng: 18.6, tags: ["Historia"] }),
  ];
  // Nocleg BEZ miejscePowiazane (dokładnie tak jak wpis zaimportowany z
  // Geoapify wyglądałby) — celowo, żeby dowieść, że dopasowanie idzie po
  // współrzędnych, nie po tym polu.
  const nocleg = makeNocleg({ lat: 54.0, lng: 17.41 }); // ~0.6 km od zNoclegiem

  const candidates = suggestBaseCandidates(
    [zNoclegiem, ...sasiedziA, bezNoclegu, ...sasiedziB],
    { interests: [], regionTypes: ["Morze"] },
    [nocleg],
  );

  const slugs = candidates.map((c) => c.slug);
  const idxZ = slugs.indexOf("z-noclegiem-tabela");
  const idxBez = slugs.indexOf("bez-noclegu-tabela");
  assert.ok(idxZ !== -1 && idxBez !== -1, `obie miejscowości powinny się pojawić: ${JSON.stringify(slugs)}`);
  assert.ok(
    idxZ < idxBez,
    `nocleg z tabeli (dopasowany po współrzędnych) powinien wystarczyć, żeby wyprzedzić miejscowość bez żadnego potwierdzonego noclegu: ${JSON.stringify(slugs)}`,
  );
});

test("kryterium 'różnorodność kategorii atrakcji': przy identycznej gęstości i braku noclegu wygrywa miejscowość z bardziej zróżnicowanymi sąsiadami", () => {
  const zroznicowana = makePlace({
    slug: "zroznicowana",
    title: "Zróżnicowana",
    lat: 54.0,
    lng: 17.4,
    tags: ["Zamki i Pałace"],
  });
  const sasiedziZroznicowani = [
    makePlace({ slug: "hist", title: "Historyczne", lat: 54.16, lng: 17.4, tags: ["Historia"] }),
    makePlace({ slug: "nat", title: "Przyrodnicze", lat: 53.84, lng: 17.4, tags: ["Natura"] }),
  ];
  const jednorodna = makePlace({
    slug: "jednorodna",
    title: "Jednorodna",
    lat: 54.0,
    lng: 18.6,
    tags: ["Zamki i Pałace"],
  });
  const sasiedziJednorodni = [
    makePlace({ slug: "relaks1", title: "Relaks 1", lat: 54.16, lng: 18.6, tags: ["Relaks"] }),
    makePlace({ slug: "relaks2", title: "Relaks 2", lat: 53.84, lng: 18.6, tags: ["Relaks"] }),
  ];

  const candidates = suggestBaseCandidates(
    [zroznicowana, ...sasiedziZroznicowani, jednorodna, ...sasiedziJednorodni],
    { interests: [], regionTypes: ["Morze"] },
  );

  const slugs = candidates.map((c) => c.slug);
  const idxZ = slugs.indexOf("zroznicowana");
  const idxJ = slugs.indexOf("jednorodna");
  assert.ok(idxZ !== -1 && idxJ !== -1, `obie miejscowości powinny się pojawić: ${JSON.stringify(slugs)}`);
  assert.ok(
    idxZ < idxJ,
    `przy tej samej gęstości "Zróżnicowana" (Historia+Natura) powinna wyprzedzić "Jednorodna" (sam Relaks): ${JSON.stringify(slugs)}`,
  );
});

test("kryterium 'centralne położenie': przy identycznej gęstości, różnorodności i noclegu wygrywa miejscowość bliższa środkowi ciężkości atrakcji regionu", () => {
  const centralna = makePlace({
    slug: "centralna",
    title: "Centralna",
    lat: 54.0,
    lng: 17.4,
    tags: ["Zamki i Pałace"],
  });
  const sasiedziCentralnej = [
    makePlace({ slug: "c1", title: "C1", lat: 54.16, lng: 17.4, tags: ["Historia"] }),
    makePlace({ slug: "c2", title: "C2", lat: 53.84, lng: 17.4, tags: ["Natura"] }),
  ];
  const brzegowa = makePlace({
    slug: "brzegowa",
    title: "Brzegowa",
    lat: 54.0,
    lng: 18.6,
    tags: ["Zamki i Pałace"],
  });
  const sasiedziBrzegowej = [
    makePlace({ slug: "e1", title: "E1", lat: 54.16, lng: 18.6, tags: ["Historia"] }),
    makePlace({ slug: "e2", title: "E2", lat: 53.84, lng: 18.6, tags: ["Natura"] }),
  ];
  // Odosobniona atrakcja daleko na zachód — nie liczy się jako sąsiad
  // ŻADNEJ z dwóch miejscowości (>30 km od obu), ale przesuwa środek
  // ciężkości CAŁEJ puli w stronę "Centralnej", robiąc geometrię celowo
  // ASYMETRYCZNĄ (w przeciwieństwie do dwóch testów wyżej).
  const odlegleNaZachod = makePlace({
    slug: "daleko-zachod",
    title: "Daleko na zachodzie",
    lat: 54.0,
    lng: 16.5,
    tags: ["Aktywność fizyczna"],
  });

  const candidates = suggestBaseCandidates(
    [centralna, ...sasiedziCentralnej, brzegowa, ...sasiedziBrzegowej, odlegleNaZachod],
    { interests: [], regionTypes: ["Morze"] },
  );

  const slugs = candidates.map((c) => c.slug);
  const idxC = slugs.indexOf("centralna");
  const idxB = slugs.indexOf("brzegowa");
  assert.ok(idxC !== -1 && idxB !== -1, `obie miejscowości powinny się pojawić: ${JSON.stringify(slugs)}`);
  assert.ok(
    idxC < idxB,
    `przy tej samej gęstości i różnorodności "Centralna" (bliżej środka ciężkości atrakcji regionu) powinna wyprzedzić "Brzegowa" (na skraju): ${JSON.stringify(slugs)}`,
  );
});

// ---------------------------------------------------------------------------
// Zgłoszenie 06.09 (Poziom 2/2.5): zamek/pałac/dwór wyklucza się z bycia
// bazą tak samo jak park narodowy — CHYBA że faktycznie prowadzi hotel.

test("functionsAsHotel: rozpoznaje frazę 'dziś hotel' w opisie (Zamek w Rydzynie, Pałac w Wąsowie)", () => {
  assert.equal(functionsAsHotel({ description: "Barokowa rezydencja, dziś hotel i restauracja." }), true);
  assert.equal(functionsAsHotel({ description: "Renesansowa budowla, dziś muzeum i atrakcja turystyczna." }), false);
});

test("zamek/pałac/dwór (po nazwie) bez potwierdzonej funkcji hotelowej nie jest proponowany jako baza", () => {
  const zamek = makePlace({
    slug: "zamek-cesarski-w-poznaniu",
    title: "Zamek Cesarski w Poznaniu",
    lat: 52.4078,
    lng: 16.9186,
    tags: ["Historia", "Architektura", "Zamki i Pałace"],
    description: "Monumentalna rezydencja ostatnich cesarzy niemieckich.",
  });
  const poznan = makePlace({
    slug: "poznan",
    title: "Poznań",
    lat: 52.4103,
    lng: 16.9486,
    tags: ["Architektura", "Historia"],
    description: "Stolica Wielkopolski.",
  });

  const candidates = suggestBaseCandidates([zamek, poznan], { interests: [], regionTypes: [] });

  const slugs = candidates.map((c) => c.slug);
  assert.ok(
    !slugs.includes("zamek-cesarski-w-poznaniu"),
    `zamek bez funkcji hotelowej nie powinien być propozycją bazy: ${JSON.stringify(slugs)}`,
  );
  assert.ok(slugs.includes("poznan"), "Poznań (prawdziwa miejscowość) powinien zostać zaproponowany");
});

test("miejsce nazwane 'Kórnik i Rogalin' MA tag 'Zamki i Pałace', ale NIE zaczyna się od 'Zamek'/'Pałac' — zostaje pełnoprawnym kandydatem", () => {
  const kornik = makePlace({
    slug: "kornik-i-rogalin",
    title: "Kórnik i Rogalin",
    lat: 52.25,
    lng: 17.09,
    tags: ["Historia", "Architektura", "Natura", "Zamki i Pałace"],
    description: "Zamek Działyńskich w Kórniku i pałac Raczyńskich w Rogalinie.",
  });

  const candidates = suggestBaseCandidates([kornik], { interests: [], regionTypes: [] });

  assert.ok(
    candidates.some((c) => c.slug === "kornik-i-rogalin"),
    "wielomiejscowościowa baza z tagiem 'Zamki i Pałace' (ale inną nazwą) nie powinna zostać wykluczona",
  );
});

test("zamek/pałac z potwierdzoną funkcją hotelową ('dziś hotel' w opisie) MOŻE być propozycją bazy", () => {
  const zamekHotel = makePlace({
    slug: "zamek-w-rydzynie",
    title: "Zamek w Rydzynie",
    lat: 51.7874,
    lng: 16.671,
    tags: ["Historia", "Architektura", "Zamki i Pałace"],
    description: "Barokowa rezydencja Leszczyńskich i Sułkowskich, dziś hotel i restauracja.",
  });

  const candidates = suggestBaseCandidates([zamekHotel], { interests: [], regionTypes: [] });

  assert.ok(
    candidates.some((c) => c.slug === "zamek-w-rydzynie"),
    "zamek z potwierdzoną funkcją hotelową powinien zostać zaproponowany jako baza",
  );
});

test("suggestBaseCandidates bez podanej tabeli noclegi (parametr domyślny) działa identycznie jak wcześniej — kompatybilność wsteczna", () => {
  const a = makePlace({ slug: "a", title: "A", lat: 54.0, lng: 17.0 });
  const b = makePlace({ slug: "b", title: "B", lat: 54.05, lng: 17.05 });

  // Brak trzeciego argumentu w ogóle — dokładnie tak, jak wołały to
  // wszystkie testy w tym pliku sprzed zgłoszenia 06.09.
  const candidates = suggestBaseCandidates([a, b], { interests: [], regionTypes: ["Morze"] });

  assert.equal(candidates.length, 2);
});
