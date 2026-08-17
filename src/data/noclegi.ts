export const NOCLEG_TYPE_OPTIONS = [
  "kemping",
  "pole namiotowe",
  "hotel",
  "pensjonat",
] as const;
export type NoclegTyp = (typeof NOCLEG_TYPE_OPTIONS)[number];

export const POZIOM_KOMFORTU_OPTIONS = [
  "budżetowy",
  "standardowy",
  "premium",
] as const;
export type PoziomKomfortu = (typeof POZIOM_KOMFORTU_OPTIONS)[number];

export type Nocleg = {
  id: string;
  nazwa: string;
  typ: NoclegTyp;
  lat: number;
  lng: number;
  // Slug miejsca z tabeli places, przy którym ten nocleg leży najbliżej —
  // pole redakcyjne/informacyjne, patrz komentarz w supabase/add_noclegi.sql.
  miejscePowiazane: string | null;
  udogodnienia: string | null;
  poziomKomfortu: PoziomKomfortu | null;
};
