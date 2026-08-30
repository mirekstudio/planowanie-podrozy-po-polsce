import { test } from "node:test";
import assert from "node:assert/strict";
import { isWithinSupportedRegions } from "./poland";

// Dowód dla punktu 2 ścieżki naprawczej, część 2 (23.08): appka ma
// obsługiwać wyłącznie Wielkopolskę i wybrzeże. isWithinSupportedRegions
// to wspólny strażnik używany zarówno w getRoutePlaces.ts (ogólny
// fallback planera), jak i w accommodation.ts (fallback noclegowy).

test("punkt w centrum Poznania (Wielkopolska) jest uznany za wspierany", () => {
  assert.equal(isWithinSupportedRegions({ lat: 52.4064, lng: 16.9252 }), true);
});

test("punkt w Ustce (środek wybrzeża) jest uznany za wspierany", () => {
  assert.equal(isWithinSupportedRegions({ lat: 54.5805, lng: 16.8614 }), true);
});

test("Zakopane (Tatry) NIE jest uznane za wspierane", () => {
  assert.equal(isWithinSupportedRegions({ lat: 49.2992, lng: 19.9496 }), false);
});

test("realny przypadek z audytu: zamek w Kole (~52.19, 18.57) leży tuż za wschodnią granicą Wielkopolski i NIE jest wspierany", () => {
  // Dokładnie ten punkt, który w poprzedniej naprawie (getCategoryPlaces.ts)
  // Geoapify realnie zwrócił dla kategorii "Zamki i Pałace" w promieniu
  // kotwic Wielkopolski, ale poza WIELKOPOLSKA_BOUNDS (maxLng 18.22).
  assert.equal(isWithinSupportedRegions({ lat: 52.1978208, lng: 18.6085176 }), false);
});

test("punkt w Berlinie (za granicą) NIE jest wspierany", () => {
  assert.equal(isWithinSupportedRegions({ lat: 52.52, lng: 13.405 }), false);
});
