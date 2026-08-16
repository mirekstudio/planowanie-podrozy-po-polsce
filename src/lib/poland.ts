import type { Coordinates } from "@/lib/generateRoute";

// Przybliżony prostokąt otaczający terytorium Polski — twardy filtr
// geograficzny dla zapytań do Geoapify, żeby wyniki nigdy nie wykraczały
// poza Polskę, niezależnie od tego, gdzie faktycznie znajduje się punkt
// startowy użytkownika (np. Zurych). To uproszczenie — prostokąt, a nie
// dokładny wielokąt granic — więc w narożnikach obejmuje wąskie skrawki
// sąsiednich krajów (Niemiec, Czech, Słowacji, Ukrainy, Białorusi,
// Litwy). W praktyce eliminuje to jednak sytuacje typu "szukamy w
// promieniu od Zurychu" i zwraca niemal wyłącznie polskie miejsca.
export const POLAND_BOUNDS = {
  minLat: 49.0,
  maxLat: 54.9,
  minLng: 14.1,
  maxLng: 24.2,
};

export function isWithinPoland(point: Coordinates): boolean {
  return (
    point.lat >= POLAND_BOUNDS.minLat &&
    point.lat <= POLAND_BOUNDS.maxLat &&
    point.lng >= POLAND_BOUNDS.minLng &&
    point.lng <= POLAND_BOUNDS.maxLng
  );
}

// Reprezentatywne punkty geograficzne dla tych wartości typ_regionu,
// które wskazują na konkretny, ograniczony obszar Polski — używane jako
// środek wyszukiwania zamiast (potencjalnie zagranicznego) punktu
// startowego. "Miasta" nie ma tu wpisu — miasta są rozsiane po całym
// kraju, więc nie ma dla nich jednego sensownego punktu odniesienia.
export const REGION_TYPE_ANCHORS: Partial<Record<string, Coordinates>> = {
  Morze: { lat: 54.5805, lng: 16.8614 }, // Ustka — środek polskiego wybrzeża
  Góry: { lat: 49.2992, lng: 19.9496 }, // Zakopane — brama Tatr
  Jeziora: { lat: 54.0384, lng: 21.7573 }, // Giżycko — serce Mazur
};

// Ostateczny fallback, gdy nie ma żadnego innego punktu odniesienia
// (np. pusta baza kuratorska i brak punktu startowego).
export const POLAND_CENTER: Coordinates = { lat: 52.0, lng: 19.0 };

export type SubRegion = {
  id: string;
  title: string;
  summary: string;
  anchor: Coordinates;
};

// Polskie wybrzeże rozciąga się na ok. 500 km (Świnoujście–granica z
// Rosją) — jeden punkt-kotwica (REGION_TYPE_ANCHORS.Morze) i promień
// 60-90 km wystarczają na trasę 2-3-dniową, ale przy dłuższych podróżach
// (5-7+ dni) skupiają całą trasę na wąskim wycinku wybrzeża. Dla takich
// "rozciągniętych" typów regionu warianty trasy mają być geograficznie
// różne — każdy pokrywający inny odcinek — zamiast tylko różnić się
// tempem zwiedzania w tym samym miejscu. Góry i Jeziora nie mają tu
// wpisu: Tatry i Mazury są znacznie bardziej zwarte geograficznie, więc
// jeden punkt-kotwica wystarcza.
export const COASTAL_SUB_REGIONS: SubRegion[] = [
  {
    id: "zachodnie-wybrzeze",
    title: "Zachodnie wybrzeże",
    summary: "Świnoujście – Kołobrzeg",
    anchor: { lat: 54.04, lng: 14.91 },
  },
  {
    id: "srodkowe-wybrzeze",
    title: "Środkowe wybrzeże",
    summary: "Łeba – Słowiński Park Narodowy",
    anchor: { lat: 54.7597, lng: 17.5536 },
  },
  {
    id: "wschodnie-wybrzeze",
    title: "Wschodnie wybrzeże",
    summary: "Trójmiasto – Hel",
    // Prosty środek geometryczny Gdańsk-Hel wypada na środku Zatoki
    // Gdańskiej (Hel to długi, wąski półwysep zakrzywiony w morze) — w
    // testach dawał promień wyszukiwania bez żadnego lądu w zasięgu.
    // Gdynia leży realnie na lądzie, w Trójmieście, w stronę Helu.
    anchor: { lat: 54.5189, lng: 18.5305 }, // Gdynia
  },
];

export const SPREAD_REGION_SUB_REGIONS: Partial<Record<string, SubRegion[]>> = {
  Morze: COASTAL_SUB_REGIONS,
};
