export type Place = {
  slug: string;
  title: string;
  region: string;
  description: string;
  longDescription: string;
  lat: number;
  lng: number;
  image: string;
  imageAlt: string;
  imagePosition?: "center" | "top";
  credit: {
    author: string;
    license: string;
  };
  sortOrder: number;
  tags: string[];
  // "curated" = nasza baza Supabase (opis „z duszą” pisany przez redakcję),
  // "basic" = dociągnięte automatycznie z zewnętrznego dostawcy (patrz
  // src/lib/placesProviders). Brak pola = curated (dla zgodności z
  // miejscami tworzonymi/edytowanymi poza tym mechanizmem).
  source?: "curated" | "basic";
  sourceUrl?: string | null;
  // Zgłoszenie 05.09: neutralny emoji dopasowany do kategorii miejsca
  // (patrz getCategoryDisplay w placesProviders/geoapifyCategoryDisplay.ts)
  // — placeholder graficzny na karcie, gdy miejsce "basic" nie ma
  // prawdziwego zdjęcia. Tylko dla source: "basic" (miejsca kuratorskie
  // zawsze mają prawdziwe, redakcyjnie dobrane zdjęcie, więc go nie
  // potrzebują) — undefined dla curated.
  basicPlaceIcon?: string;
  // Wymiary filtrowania w planerze — patrz src/lib/placeFilters.ts.
  // Miejsca "basic" z zewnętrznych dostawców nie są nimi otagowane
  // (dostawcy nie znają naszej taksonomii), więc te filtry realnie
  // działają tylko na miejscach kuratorskich.
  regionType: string[];
  surroundings: string[];
  nearbyAttraction: string | null;
  // Nazwy sprawdzonych kempingów/pól namiotowych w okolicy — redakcyjna
  // rekomendacja, nie ma odpowiednika wśród dostawców zewnętrznych, więc
  // miejsca "basic" zawsze mają tu pustą tablicę.
  recommendedCampsites: string[];
  // Krótka podpowiedź kulinarna (regionalne specjały w okolicy) — jak
  // wyżej, tylko dla miejsc kuratorskich.
  culinaryTip: string | null;
  // Ręcznie oznaczane w panelu admina — steruje sekcją "Polecane" w
  // bocznym menu (patrz /miejsca?polecane=1). Miejsca "basic" nigdy nie
  // są polecane, bo nie przechodzą przez redakcyjną selekcję.
  featured: boolean;
  // Ręcznie oznaczane w panelu admina: TEN rekord to pojedyncza atrakcja
  // (zabytek, budynek, latarnia...), a nie samodzielna miejscowość z
  // własnym noclegiem — mimo pełnego opisu redakcyjnego. Używane WYŁĄCZNIE
  // przez suggestBases.ts, żeby taki rekord nie konkurował jako niezależny
  // KANDYDAT NA BAZĘ wypadową z miejscowością, w której leży (np. Zamek
  // Królewski/Cesarski w Poznaniu obok rekordu "poznan", Latarnia Morska
  // Rozewie obok "jastrzebia-gora-chlapowo"). NIE wyklucza rekordu z
  // niczego innego — nadal jest atrakcją na mapie, w kategoriach i w
  // promieniu wybranej bazy. Analogiczne do isProtectedArea, ale że to
  // ocena per rekord (a nie po tagu/nazwie — patrz komentarz w
  // suggestBases.ts), musi być polem w bazie. Pole opcjonalne, jak
  // basicPlaceIcon/source: brak = zwykłe miejsce; miejsca "basic" nigdy go
  // nie mają (nie przechodzą redakcyjnej weryfikacji).
  singleAttraction?: boolean;
};
