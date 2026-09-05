// Zgłoszenie 05.09: wymóg 1 ("sprawdź, czy odpowiedzi Geoapify zawierają
// pole ze zdjęciem") — sprawdzone bezpośrednim zapytaniem do Geoapify
// (kilkanaście realnych polskich atrakcji, w tym bardzo znane jak Zamek w
// Malborku): pole wiki_and_media.image (tag OSM "image=") jest w praktyce
// PRAWIE NIGDY nie wypełnione, nawet dla najsłynniejszych zabytków — 0 na
// ~20 sprawdzonych miejsc. Samo sprawdzenie tego pola (i wyświetlenie go,
// gdyby jednak się trafiło — patrz geoapify.ts) więc nie wystarczy, żeby
// realnie podnieść jakość kart.
//
// Geoapify NAJCZĘŚCIEJ ma za to wiki_and_media.wikipedia — referencję do
// artykułu (np. "pl:Zamek w Pucku"), NIE zdjęcie. Wikipedia ma własne,
// darmowe, bez klucza API, REST API zwracające dla każdego artykułu jego
// główne zdjęcie (thumbnail) — sprawdzone bezpośrednio: nawet dla małych
// lokalnych pomników (nie tylko dla Malborka) REST API zwraca prawdziwe
// zdjęcie. To już nie jest "sprawdzenie pola Geoapify" sensu stricto —
// to DODATKOWY krok, świadomie wykraczający poza surowe dane Geoapify,
// bo inaczej realna liczba miejsc z prawdziwym zdjęciem byłaby bliska
// zeru. Osobny, jednorazowy fetch (nie wysyłany masowo — tylko dla
// miejsc, które i tak nie mają wiki_and_media.image, patrz geoapify.ts).
export async function fetchWikipediaThumbnail(
  wikipediaRef: string | null | undefined,
): Promise<string | null> {
  if (!wikipediaRef) return null;

  // Format Geoapify to "<kod języka>:<Tytuł artykułu>", np. "pl:Zamek w Pucku".
  const separatorIndex = wikipediaRef.indexOf(":");
  if (separatorIndex === -1) return null;

  const lang = wikipediaRef.slice(0, separatorIndex).trim();
  const title = wikipediaRef.slice(separatorIndex + 1).trim();
  if (!lang || !title) return null;

  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: {
        // Wikipedia REST API prosi o identyfikowalny User-Agent —
        // artykuł bez niego bywa mocniej throttlowany.
        "User-Agent": "planowanie-podrozy-po-polsce/1.0 (kontakt: brak strony publicznej)",
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    return data?.thumbnail?.source ?? null;
  } catch {
    // Sieć/Wikipedia niedostępne, artykuł nie istnieje pod tym tytułem,
    // ujednoznacznienie zamiast artykułu itp. — po prostu brak zdjęcia,
    // appka i tak ma placeholder kategorii jako kolejną linię obrony.
    return null;
  }
}
