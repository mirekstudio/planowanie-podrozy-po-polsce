import { test } from "node:test";
import assert from "node:assert/strict";
import type { Place } from "@/data/places";
import type { NearbyPlaceWithDistance } from "@/lib/suggestBases";
import { remainingTripDays, prioritizeForToday, describePriorityMode } from "./dzisPrioritization";

let placeCounter = 0;
function makePlace(overrides: Partial<Place>): Place {
  placeCounter += 1;
  return {
    slug: `miejsce-${placeCounter}`,
    title: `Miejsce ${placeCounter}`,
    region: "Test",
    description: "",
    longDescription: "",
    lat: 0,
    lng: 0,
    image: "",
    imageAlt: "",
    credit: { author: "", license: "" },
    sortOrder: 0,
    tags: [],
    regionType: [],
    surroundings: [],
    nearbyAttraction: null,
    recommendedCampsites: [],
    culinaryTip: null,
    featured: false,
    ...overrides,
  };
}

function entry(place: Place, distanceKm: number): NearbyPlaceWithDistance {
  return { place, distanceKm };
}

test("remainingTripDays: w dniu rozpoczęcia zwraca pełną liczbę zaplanowanych dni", () => {
  const today = new Date(2026, 8, 6); // 6 września 2026
  assert.equal(remainingTripDays("2026-09-06", 3, today), 3);
});

test("remainingTripDays: maleje o jeden z każdym kolejnym dniem", () => {
  const today = new Date(2026, 8, 7);
  assert.equal(remainingTripDays("2026-09-06", 3, today), 2);
});

test("remainingTripDays: nigdy nie schodzi poniżej zera po zakończeniu podróży", () => {
  const today = new Date(2026, 8, 20);
  assert.equal(remainingTripDays("2026-09-06", 3, today), 0);
});

test("prioritizeForToday: przy deszczu atrakcje 'pod dachem' (tag Historia/Zamki) idą przed plenerowymi, zachowując kolejność w obrębie tej samej rangi", () => {
  const daleki_zamek = makePlace({ tags: ["Zamki i Pałace"] });
  const bliska_plaza = makePlace({ tags: ["Relaks"] });
  const dalsza_plaza = makePlace({ tags: ["Relaks"] });
  const nearby = [entry(bliska_plaza, 2), entry(dalsza_plaza, 5), entry(daleki_zamek, 20)];

  const result = prioritizeForToday(nearby, { weatherMood: "rain", remainingDays: 10 });

  assert.deepEqual(
    result.map((r) => r.place),
    [daleki_zamek, bliska_plaza, dalsza_plaza],
  );
  assert.equal(result[0].priorityReason, "rain-indoor");
  assert.equal(result[1].priorityReason, null);
});

test("prioritizeForToday: przy ładnej pogodzie atrakcje plenerowe (Natura) idą przed atrakcjami 'pod dachem'", () => {
  const muzeum = makePlace({ tags: ["Historia"] });
  const punkt_widokowy = makePlace({ tags: ["Natura"] });
  const nearby = [entry(muzeum, 1), entry(punkt_widokowy, 8)];

  const result = prioritizeForToday(nearby, { weatherMood: "nice", remainingDays: 10 });

  assert.deepEqual(result.map((r) => r.place), [punkt_widokowy, muzeum]);
  assert.equal(result[0].priorityReason, "nice-outdoor");
});

test("prioritizeForToday: pogoda neutralna nie zmienia oryginalnej kolejności po odległości", () => {
  const a = makePlace({ tags: ["Historia"] });
  const b = makePlace({ tags: ["Natura"] });
  const nearby = [entry(a, 3), entry(b, 7)];

  const result = prioritizeForToday(nearby, { weatherMood: "neutral", remainingDays: 10 });

  assert.deepEqual(result.map((r) => r.place), [a, b]);
  assert.equal(result[0].priorityReason, null);
  assert.equal(result[1].priorityReason, null);
});

test("prioritizeForToday: gdy zostało mało dni, 'featured' wygrywa z pogodą (tryb się NIE miesza)", () => {
  const daleka_polecana = makePlace({ tags: ["Relaks"], featured: true });
  const bliska_zwykla_plaza = makePlace({ tags: ["Relaks"], featured: false });
  const nearby = [entry(bliska_zwykla_plaza, 1), entry(daleka_polecana, 15)];

  // Pogoda "nice" faworyzowałaby OBIE (obie mają tag Relaks/plener), ale
  // przy małej liczbie dni tryb pogodowy nie powinien być w ogóle brany
  // pod uwagę — liczy się tylko featured.
  const result = prioritizeForToday(nearby, { weatherMood: "nice", remainingDays: 1 });

  assert.deepEqual(result.map((r) => r.place), [daleka_polecana, bliska_zwykla_plaza]);
  assert.equal(result[0].priorityReason, "low-days-featured");
  assert.equal(result[1].priorityReason, null);
});

test("describePriorityMode: zwraca null, gdy brak pogody i dni jest dużo (bez sztucznego komunikatu)", () => {
  assert.equal(describePriorityMode(null, 10), null);
  assert.equal(describePriorityMode("neutral", 10), null);
});

test("describePriorityMode: rozpoznaje wszystkie trzy komunikaty", () => {
  assert.match(describePriorityMode("rain", 10) ?? "", /pod dachem/);
  assert.match(describePriorityMode("nice", 10) ?? "", /plenerowe/);
  assert.match(describePriorityMode("nice", 2) ?? "", /mało dni/);
});
