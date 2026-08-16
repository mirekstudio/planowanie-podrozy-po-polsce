export const REGION_TYPE_OPTIONS = ["Morze", "Góry", "Jeziora", "Miasta"] as const;
export type RegionType = (typeof REGION_TYPE_OPTIONS)[number];

export const SURROUNDINGS_OPTIONS = [
  "Głusza/las",
  "Teren ogrodzony",
  "W centrum miasta",
  "Blisko wody",
] as const;
export type Surroundings = (typeof SURROUNDINGS_OPTIONS)[number];

// "Bliskość atrakcji" jest w bazie wolnym tekstem (dotyczy głównie
// noclegów, ale też niektórych atrakcji), więc w panelu admina to pole
// tekstowe z podpowiedziami (datalist). W planerze filtrujemy tylko po
// tych sugerowanych, ustandaryzowanych wartościach — miejsce z innym,
// ręcznie wpisanym tekstem po prostu nie będzie pasować do tego filtra.
export const NEARBY_ATTRACTION_SUGGESTIONS = [
  "Do 15 minut pieszo od plaży",
  "Bezpośredni dostęp do szlaku górskiego",
  "W centrum starego miasta",
] as const;
