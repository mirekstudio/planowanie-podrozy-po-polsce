import { test } from "node:test";
import assert from "node:assert/strict";
import { getPlaceMapIcon } from "./placeMapIcon";

// Zgłoszenie 05.09: pineski na mapach mają pokazywać ikonę kategorii, nie
// jednolitą kropkę — dla miejsc kuratorskich i "podstawowych" (Geoapify)
// naraz.

test("miejsce 'podstawowe' (Geoapify) używa już policzonej basicPlaceIcon", () => {
  assert.equal(
    getPlaceMapIcon({ source: "basic", tags: [], basicPlaceIcon: "🗼", title: "Latarnia morska Stilo" }),
    "🗼",
  );
});

test("miejsce 'podstawowe' bez policzonej ikony spada na neutralny domyślny placeholder", () => {
  assert.equal(
    getPlaceMapIcon({ source: "basic", tags: [], basicPlaceIcon: undefined, title: "Coś" }),
    "📍",
  );
});

// Realny przypadek z audytu (sprawdzony bezpośrednio w Supabase):
// "Latarnia Morska Rozewie" ma tagi ["Historia","Architektura"] — nasza
// redakcyjna taksonomia nie ma osobnej kategorii "latarnia", więc bez
// dopasowania po nazwie dostałaby ogólną ikonę zabytku (🏛️) zamiast 🗼.
test("miejsce kuratorskie bez tagu 'latarnia' w słowniku dostaje właściwą ikonę po nazwie z tytułu (Latarnia Morska Rozewie)", () => {
  assert.equal(
    getPlaceMapIcon({
      source: "curated",
      tags: ["Historia", "Architektura"],
      basicPlaceIcon: undefined,
      title: "Latarnia Morska Rozewie",
    }),
    "🗼",
  );
});

test("dopasowanie po nazwie działa też dla obiektu sakralnego i innych rozpoznanych słów kluczowych", () => {
  assert.equal(
    getPlaceMapIcon({ source: "curated", tags: ["Historia"], basicPlaceIcon: undefined, title: "Katedra w Gnieźnie" }),
    "⛪",
  );
  assert.equal(
    getPlaceMapIcon({ source: "curated", tags: ["Historia"], basicPlaceIcon: undefined, title: "Ruiny zamku \"Diabła Weneckiego\"" }),
    "🏚️",
  );
});

// Realne tagi z produkcyjnej bazy — jedno miejsce kuratorskie zwykle ma
// kilka tagów naraz, więc bardziej charakterystyczny (zamek) musi wygrać
// z ogólniejszym (historia/architektura), gdy nazwa nie daje jednoznacznej
// wskazówki wcześniej.
test("dla miejsca kuratorskiego z kilkoma tagami naraz wygrywa najbardziej charakterystyczny (zamek wygrywa z historią/architekturą)", () => {
  assert.equal(
    getPlaceMapIcon({
      source: "curated",
      tags: ["Historia", "Architektura", "Zamki i Pałace"],
      basicPlaceIcon: undefined,
      title: "Zamek w Gołuchowie",
    }),
    "🏰",
  );
});

test("park narodowy wygrywa z każdym innym tagiem", () => {
  assert.equal(
    getPlaceMapIcon({
      source: "curated",
      tags: ["Natura", "Aktywność fizyczna", "Parki Narodowe"],
      basicPlaceIcon: undefined,
      title: "Słowiński Park Narodowy",
    }),
    "🌲",
  );
});

test("dla samego tagu 'Natura' (bez bardziej specyficznych ani nazwy) zwraca ogólną ikonę przyrody", () => {
  assert.equal(
    getPlaceMapIcon({ source: "curated", tags: ["Natura"], basicPlaceIcon: undefined, title: "Rowy i Jezioro Gardno" }),
    "🌿",
  );
});

test("brak source traktowany jak kuratorskie (zgodnie z Place.source — brak pola = curated)", () => {
  assert.equal(
    getPlaceMapIcon({ source: undefined, tags: ["Zamki i Pałace"], basicPlaceIcon: undefined, title: "Zamek" }),
    "🏰",
  );
});

test("miejsce kuratorskie bez żadnego rozpoznanego tagu ani słowa kluczowego w nazwie spada na neutralny domyślny placeholder", () => {
  assert.equal(
    getPlaceMapIcon({ source: "curated", tags: [], basicPlaceIcon: undefined, title: "Coś nierozpoznanego" }),
    "📍",
  );
});
