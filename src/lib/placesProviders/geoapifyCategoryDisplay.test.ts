import { test } from "node:test";
import assert from "node:assert/strict";
import { getCategoryDisplay } from "./geoapifyCategoryDisplay";

// Zgłoszenie 05.09: karty "Odkryj więcej" bez zdjęcia mają placeholder
// dopasowany do TYPU miejsca (latarnia, plaża, zamek...), nie jedną
// uniwersalną pinezkę dla wszystkiego.

test("rozpoznaje latarnię morską po obu realnych kategoriach Geoapify (man_made.lighthouse i tourism.sights.lighthouse)", () => {
  assert.deepEqual(getCategoryDisplay(["man_made.lighthouse"]), {
    label: "Latarnia morska",
    icon: "🗼",
  });
  assert.deepEqual(getCategoryDisplay(["tourism", "tourism.sights", "tourism.sights.lighthouse"]), {
    label: "Latarnia morska",
    icon: "🗼",
  });
});

test("rozpoznaje plażę i kurort nadmorski jako osobne, bardziej specyficzne kategorie", () => {
  assert.deepEqual(getCategoryDisplay(["beach"]), { label: "Plaża", icon: "🏖️" });
  assert.deepEqual(getCategoryDisplay(["beach", "beach.beach_resort"]), {
    label: "Kurort nadmorski",
    icon: "🏖️",
  });
});

// Realny przypadek z audytu (Zamek Krzyżacki w Pucku): kategorie
// ["access","access.yes","tourism","tourism.sights","tourism.sights.ruines"]
// — najbardziej specyficzna kategoria (ruines) musi wygrać z ogólną
// "tourism.sights", niezależnie od kolejności w tablicy.
test("bardziej specyficzna kategoria (zamek/ruiny) wygrywa z ogólną nadrzędną kategorią (tourism.sights)", () => {
  assert.deepEqual(
    getCategoryDisplay(["access", "access.yes", "tourism", "tourism.sights", "tourism.sights.ruines"]),
    { label: "Ruiny", icon: "🏚️" },
  );
  assert.deepEqual(
    getCategoryDisplay(["tourism", "tourism.sights", "tourism.sights.castle", "heritage"]),
    { label: "Zamek", icon: "🏰" },
  );
});

test("dla nieznanej/pustej listy kategorii zwraca neutralny domyślny placeholder, nie rzuca wyjątku", () => {
  assert.deepEqual(getCategoryDisplay([]), { label: "Ciekawe miejsce", icon: "📍" });
  assert.deepEqual(getCategoryDisplay(undefined), { label: "Ciekawe miejsce", icon: "📍" });
  assert.deepEqual(getCategoryDisplay(["some.unknown.category"]), {
    label: "Ciekawe miejsce",
    icon: "📍",
  });
});

test("rozpoznaje pomnik i obiekt sakralny — realne przypadki z audytu Wschodniego wybrzeża", () => {
  assert.deepEqual(getCategoryDisplay(["tourism", "tourism.sights", "tourism.sights.memorial"]), {
    label: "Pomnik",
    icon: "🗿",
  });
  assert.deepEqual(
    getCategoryDisplay(["tourism", "tourism.sights", "tourism.sights.memorial", "tourism.sights.memorial.wayside_cross"]),
    { label: "Pomnik", icon: "🗿" },
  );
});
