export const REGION_TYPE_OPTIONS = [
  "Morze",
  "Góry",
  "Jeziora",
  "Miasta",
  "Lasy",
  "Rzeka",
] as const;
export type RegionType = (typeof REGION_TYPE_OPTIONS)[number];

// Ścieżka naprawcza z planu rozwoju (16.08): zero nowych regionów w
// appce, dopóki appka nie ograniczy się realnie do Wielkopolski i
// wybrzeża. "Morze" ma już kuratorską treść i twardą walidację granic
// (patrz generateRoute.ts); Góry/Jeziora/Miasta/Lasy/Rzeka generują
// trasy WYŁĄCZNIE z automatycznych danych Geoapify, bez żadnej redakcji
// — pokazanie ich testerom teraz zafałszowałoby wynik Fazy 2 (Concierge
// MVP), bo appka wyglądałaby na gotową dla całej Polski, choć nie jest.
// REGION_TYPE_OPTIONS zostaje pełne (używane w panelu admina do
// tagowania przyszłych treści) — to poniższe ograniczenie dotyczy tylko
// tego, co widzi/może wybrać użytkownik w planerze.
export const ACTIVE_REGION_TYPE_OPTIONS: RegionType[] = ["Morze"];

// Odrzuca każdą wartość spoza ACTIVE_REGION_TYPE_OPTIONS — używane zarówno
// przy wypełnianiu formularza wartościami z URL, jak i tuż przed
// generowaniem trasy na /planer/wynik. Dwa niezależne miejsca celowo: samo
// wyszarzenie checkboxów w PlanerForm nie chroni przed kimś, kto wklei
// link z ?regionType=Góry ręcznie, więc generowanie trasy musi mieć
// własną, niezależną blokadę.
export function filterActiveRegionTypes(regionTypes: string[]): string[] {
  const active = new Set<string>(ACTIVE_REGION_TYPE_OPTIONS);
  return regionTypes.filter((value) => active.has(value));
}

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
