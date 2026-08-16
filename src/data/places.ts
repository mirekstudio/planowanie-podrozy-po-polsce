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
  // Wymiary filtrowania w planerze — patrz src/lib/placeFilters.ts.
  // Miejsca "basic" z zewnętrznych dostawców nie są nimi otagowane
  // (dostawcy nie znają naszej taksonomii), więc te filtry realnie
  // działają tylko na miejscach kuratorskich.
  regionType: string[];
  surroundings: string[];
  nearbyAttraction: string | null;
};
