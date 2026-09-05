import { test } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import type { RouteVariant } from "@/lib/generateRoute";
import { summarizeStopTitles, displaySummary } from "./routeVariantDisplay";

// Zgłoszenie 05.09 (kontynuacja): karty wariantów i nagłówek wybranej
// trasy na /planer/wynik pokazywały statyczny opis podregionu (np.
// "Świnoujście – Kołobrzeg – Ustka") obok mapy z zupełnie inną liczbą i
// treścią przystanków. Te testy dowodzą, że podpis dla wariantów
// wybrzeża pochodzi teraz z TYCH SAMYCH przystanków co mapa.

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

function makeVariant(overrides: Partial<RouteVariant> & { id: string }): RouteVariant {
  return {
    title: "Testowy wariant",
    summary: "Statyczny opis, nieużywany dla wybrzeża",
    route: {
      stops: [],
      days: [],
      totalDistanceKm: 0,
      usedFallback: false,
      dailyHoursLimit: 7,
    },
    ...overrides,
  };
}

test("summarizeStopTitles łączy unikalne tytuły myślnikiem, bez duplikatów", () => {
  const stops = [
    makePlace({ title: "Łeba", lat: 54.76, lng: 17.55 }),
    makePlace({ title: "Ustka", lat: 54.58, lng: 16.86 }),
    makePlace({ title: "Łeba", lat: 54.76, lng: 17.55 }), // duplikat (np. dwa przystanki tego samego dnia)
  ];

  assert.equal(summarizeStopTitles(stops), "Łeba – Ustka");
});

test("summarizeStopTitles skraca z '…', gdy przystanków jest więcej niż limit — nigdy nie wymienia więcej niż limit nazw", () => {
  const stops = [
    makePlace({ title: "A", lat: 1, lng: 1 }),
    makePlace({ title: "B", lat: 2, lng: 2 }),
    makePlace({ title: "C", lat: 3, lng: 3 }),
    makePlace({ title: "D", lat: 4, lng: 4 }),
    makePlace({ title: "E", lat: 5, lng: 5 }),
  ];

  const result = summarizeStopTitles(stops, 3);

  assert.equal(result, "A – B – C – …");
});

test("summarizeStopTitles zwraca null dla pustej listy przystanków (żeby wywołujący mógł spaść na opisowy fallback)", () => {
  assert.equal(summarizeStopTitles([]), null);
});

test("displaySummary dla wariantu odcinka wybrzeża buduje podpis z prawdziwych przystanków, nie statycznego opisu regionu", () => {
  const variant = makeVariant({
    id: "zachodnie-wybrzeze", // ID podregionu wybrzeża — patrz COASTAL_SUB_REGIONS
    summary: "Świnoujście – Kołobrzeg – Ustka", // statyczny opis, NIE powinien się pojawić
    route: {
      stops: [
        makePlace({ title: "Plaża zachodnia", lat: 53.9, lng: 14.3 }),
        makePlace({ title: "Plaża Strzeżona", lat: 54.1, lng: 15.6 }),
      ],
      days: [],
      totalDistanceKm: 10,
      usedFallback: false,
      dailyHoursLimit: 7,
    },
  });

  assert.equal(
    displaySummary(variant),
    "Plaża zachodnia – Plaża Strzeżona",
    "powinien użyć prawdziwych tytułów przystanków, nie statycznego opisu podregionu",
  );
});

test("displaySummary dla wariantu odcinka wybrzeża BEZ przystanków spada na statyczny opis (nie zostawia pustego podpisu)", () => {
  const variant = makeVariant({
    id: "srodkowe-wybrzeze",
    summary: "Ustka – Rowy – Łeba – Karwia – Jastrzębia Góra – Chłapowo",
    route: { stops: [], days: [], totalDistanceKm: 0, usedFallback: true, dailyHoursLimit: 7 },
  });

  assert.equal(displaySummary(variant), "Ustka – Rowy – Łeba – Karwia – Jastrzębia Góra – Chłapowo");
});

test("displaySummary dla wariantu NIE będącego podregionem wybrzeża (tempo/zainteresowanie) zostaje bez zmian — brak ryzyka rozjazdu", () => {
  const wariantTempa = makeVariant({
    id: "spokojne",
    summary: "Mniej przystanków dziennie, więcej czasu na zwiedzanie każdego miejsca.",
    route: {
      stops: [makePlace({ title: "Cokolwiek", lat: 1, lng: 1 })],
      days: [],
      totalDistanceKm: 5,
      usedFallback: false,
      dailyHoursLimit: 7,
    },
  });

  assert.equal(
    displaySummary(wariantTempa),
    "Mniej przystanków dziennie, więcej czasu na zwiedzanie każdego miejsca.",
    "warianty tempa/zainteresowania mają opisowe summary — nie powinny być zamieniane na listę przystanków",
  );
});
