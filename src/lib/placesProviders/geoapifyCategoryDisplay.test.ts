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

// Zgłoszenie 05.09 (kontynuacja): kategoria "beach" jest w Geoapify/OSM
// używana dla KAŻDEGO fizycznego punktu na/przy plaży — realny dowód
// sprawdzony bezpośrednio w API (oba endpointy, search i place-details):
// "Zatopiony las koło Czołpina" (atrakcja przyrodnicza — zatopione pnie
// drzew widoczne w wodzie) ma w danych JEDYNĄ kategorię "beach" (surowy
// tag OSM: natural=beach), mimo że nazwa jednoznacznie mówi o lesie.
test("nazwa jednoznacznie wskazująca na las nadpisuje mylącą kategorię 'beach' — realny przypadek z audytu (Zatopiony las koło Czołpina)", () => {
  assert.deepEqual(getCategoryDisplay(["beach"], "Zatopiony las koło Czołpina"), {
    label: "Obszar naturalny",
    icon: "🌲",
  });
});

test("nadpisanie po nazwie działa też dla różnych odmian słowa 'las' i dla rezerwatu/wąwozu", () => {
  assert.deepEqual(getCategoryDisplay(["beach"], "Ścieżka przez las"), {
    label: "Obszar naturalny",
    icon: "🌲",
  });
  assert.deepEqual(getCategoryDisplay(["beach"], "Widok na lesie"), {
    label: "Obszar naturalny",
    icon: "🌲",
  });
  assert.deepEqual(getCategoryDisplay(["beach.beach_resort"], "Rezerwat Mierzeja Sarbska"), {
    label: "Rezerwat przyrody",
    icon: "🌿",
  });
  assert.deepEqual(getCategoryDisplay(["beach"], "Wąwóz Kredowy"), {
    label: "Obszar naturalny",
    icon: "🌲",
  });
});

test("nadpisanie po nazwie NIE odpala się dla prawdziwych plaż ani dla kategorii innych niż beach", () => {
  // Kontrola negatywna — nazwy bez słów las/rezerwat/wąwóz zostają przy
  // kategorii "Plaża", nawet jeśli kategoria to i tak "beach".
  assert.deepEqual(getCategoryDisplay(["beach"], "Plaża Miejska"), {
    label: "Plaża",
    icon: "🏖️",
  });
  assert.deepEqual(getCategoryDisplay(["beach"], "plaża nudystów"), {
    label: "Plaża",
    icon: "🏖️",
  });
  // Nadpisanie działa TYLKO dla etykiet plażowych — bardziej specyficzna,
  // trafiona kategoria (tu: zamek) nigdy nie może zostać nadpisana przez
  // przypadkowe słowo w nazwie.
  assert.deepEqual(getCategoryDisplay(["tourism.sights.castle"], "Zamek nad Lasem"), {
    label: "Zamek",
    icon: "🏰",
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
