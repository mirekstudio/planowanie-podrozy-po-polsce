import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeNonTouristPlace, looksLikeNonLakeWaterFeature } from "./geoapify";

// Przypadki, które faktycznie pojawiły się jako "przystanki" w
// wygenerowanych trasach na produkcji (Środkowe/Wschodnie wybrzeże,
// zainteresowanie "Historia") i wyglądały dla użytkownika jak przypadkowe/
// błędne pozycje w trasie — patrz naprawa w geoapify.ts. Ten test jest
// "dowodem" wymaganym przez zasadę z planu naprawczego: nie ufać samej
// wizualnej kontroli na mapie.
test("odrzuca gabinet lekarski mimo kategorii heritage/tourism.sights", () => {
  assert.equal(
    looksLikeNonTouristPlace("Dr Med. Edward Bieszka", [
      "heritage",
      "building",
      "building.historic",
      "healthcare",
      "healthcare.clinic_or_praxis",
    ]),
    true,
  );
});

test("odrzuca po samej nazwie, nawet bez kategorii healthcare/office w danych", () => {
  // Broni się na wypadek, gdyby Geoapify/OSM nie miało akurat otagowanej
  // kategorii healthcare/office dla tego konkretnego obiektu — sama nazwa
  // (tytuł zawodowy na początku) już wystarczająco wskazuje na gabinet/
  // kancelarię, a nie atrakcję turystyczną.
  assert.equal(
    looksLikeNonTouristPlace("Dr Med. Edward Bieszka", ["heritage", "tourism.sights"]),
    true,
  );
  assert.equal(looksLikeNonTouristPlace("Kancelaria Adwokacka Jan Kowalski", []), true);
});

test("odrzuca całą miejscowość/dzielnicę zwróconą jako 'miejsce'", () => {
  assert.equal(
    looksLikeNonTouristPlace("Wrzeszcz", ["populated_place", "populated_place.suburb"]),
    true,
  );
});

test("NIE odrzuca prawdziwych atrakcji turystycznych/historycznych", () => {
  assert.equal(
    looksLikeNonTouristPlace("Zamek Książąt Pomorskich w Darłowie", [
      "tourism.sights",
      "tourism.sights.castle",
      "heritage",
    ]),
    false,
  );
  assert.equal(
    looksLikeNonTouristPlace("Grodzisko Wczesnośredniowieczne Luzino", [
      "tourism.sights",
      "heritage",
      "tourism.sights.archaeological_site",
    ]),
    false,
  );
  assert.equal(
    looksLikeNonTouristPlace("Latarnia Morska Rozewie", ["tourism.sights.lighthouse"]),
    false,
  );
});

test("NIE odrzuca nazw, które tylko przypadkiem zawierają fragment wzorca", () => {
  // Zabezpieczenie przed zbyt zachłannym dopasowaniem regexu — nazwa
  // zawierająca w środku ciąg podobny do skrótu tytułu, ale nie na
  // początku i nie jako osobne słowo, nie powinna być odrzucana.
  assert.equal(looksLikeNonTouristPlace("Ośrodek Wypoczynkowy Drewniana Chata", []), false);
});

// Dowód dla filtra swoistego dla "Jeziora" (zgłoszenie 03.09) — Geoapify
// nie ma węższej kategorii niż "natural.water" dla jezior (sprawdzone w
// dokumentacji), więc te dwa przykłady mają dokładnie te same kategorie co
// prawdziwe jeziora ["natural","natural.water"] — jedyny sygnał, po którym
// da się je odróżnić, to nazwa.
test("looksLikeNonLakeWaterFeature odrzuca zatopioną kopalnię i przemysłowy basen składowy", () => {
  assert.equal(looksLikeNonLakeWaterFeature("Dawna kopalnia kredy"), true);
  assert.equal(looksLikeNonLakeWaterFeature("Basen składowy"), true);
  assert.equal(looksLikeNonLakeWaterFeature("Basen"), true);
});

test("looksLikeNonLakeWaterFeature NIE odrzuca prawdziwych jezior, w tym bez słowa „Jezioro” w nazwie", () => {
  assert.equal(looksLikeNonLakeWaterFeature("Jezioro Chobienickie"), false);
  assert.equal(looksLikeNonLakeWaterFeature("Czarny Staw"), false);
  // Nazwy krótkich jezior bez prefiksu "Jezioro" (częste w OSM) — nie mogą
  // być odrzucane tylko dlatego, że są niestandardowe.
  assert.equal(looksLikeNonLakeWaterFeature("Wilcze"), false);
  assert.equal(looksLikeNonLakeWaterFeature("Trzy Tonie"), false);
});
