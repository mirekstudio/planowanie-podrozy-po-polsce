import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWikipediaThumbnail } from "./wikipediaThumbnail";

// Ten sam wzorzec co reszta appki dla funkcji sieciowych (patrz
// geoapify.test.ts — fetchProtectedPlaces/fetchPlaceDetails też nie są
// tu jednostkowo testowane, tylko weryfikowane na żywo): testujemy więc
// tylko część BEZ sieci — walidację/parsowanie referencji, zanim appka w
// ogóle spróbowałaby coś pobrać. Rzeczywiste pobieranie miniatury z
// Wikipedii zweryfikowane bezpośrednim zapytaniem podczas audytu 05.09
// (Zamek w Malborku, Zamek w Pucku, Pomnik Armii Krajowej w Sopocie —
// wszystkie zwróciły prawdziwe zdjęcie).

test("zwraca null (bez próby sieciowej) dla brakującej referencji", async () => {
  assert.equal(await fetchWikipediaThumbnail(null), null);
  assert.equal(await fetchWikipediaThumbnail(undefined), null);
  assert.equal(await fetchWikipediaThumbnail(""), null);
});

test("zwraca null dla referencji bez dwukropka (nierozpoznany format 'lang:Tytuł')", () => {
  return fetchWikipediaThumbnail("Zamek w Malborku bez prefiksu języka").then((result) => {
    assert.equal(result, null);
  });
});
