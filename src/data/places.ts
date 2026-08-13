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
  // "basic" = dociągnięte automatycznie z OpenTripMap. Brak pola = curated
  // (dla zgodności z miejscami tworzonymi/edytowanymi poza tym mechanizmem).
  source?: "curated" | "basic";
  sourceUrl?: string | null;
};
