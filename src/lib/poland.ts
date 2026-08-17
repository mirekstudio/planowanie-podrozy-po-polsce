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

// Ogólna wersja isWithinPoland dla dowolnego prostokąta — używana m.in.
// jako twardy "strażnik" dla podregionów wybrzeża (patrz SubRegion.bounds
// i enforceSubRegionBounds w generateRoute.ts).
export function isWithinBounds(point: Coordinates, bounds: Bounds): boolean {
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lng >= bounds.minLng &&
    point.lng <= bounds.maxLng
  );
}

// Reprezentatywne punkty geograficzne dla tych wartości typ_regionu,
// które wskazują na konkretny, ograniczony obszar Polski — używane jako
// środek wyszukiwania zamiast (potencjalnie zagranicznego) punktu
// startowego. "Miasta" nie ma tu wpisu — miasta są rozsiane po całym
// kraju, więc nie ma dla nich jednego sensownego punktu odniesienia.
//
// Lasy/Rzeka mają ten sam problem co Miasta (lasy i rzeki są wszędzie w
// Polsce, nie ma jednego "właściwego" miejsca) — ale w odróżnieniu od
// Miasta MUSZĄ mieć tu wpis: bez własnej bazy kuratorskiej (na razie),
// getRoutePlaces.ts oznacza wyniki z Geoapify typem regionu tylko wtedy,
// gdy ma dla niego kotwicę (patrz geoAnchoredRegionTypes) — bez niej
// wyniki zostałyby później odrzucone przez ten sam filtr typu regionu,
// który miały spełniać, i appka pokazywałaby zero miejsc. Wybrano po
// jednym reprezentatywnym miejscu (ten sam kompromis co Zakopane dla
// Gór czy Giżycko dla Jezior) — realnie ogranicza to wyszukiwanie do
// okolic tego miejsca, nie całej Polski.
export const REGION_TYPE_ANCHORS: Partial<Record<string, Coordinates>> = {
  Morze: { lat: 54.5805, lng: 16.8614 }, // Ustka — środek polskiego wybrzeża
  Góry: { lat: 49.2992, lng: 19.9496 }, // Zakopane — brama Tatr
  Jeziora: { lat: 54.0384, lng: 21.7573 }, // Giżycko — serce Mazur
  // Puszcza Kampinoska — rozległy, dobrze znany kompleks leśny wygodnie w
  // głębi kraju (celowo NIE Białowieża: leży dosłownie na granicy z
  // Białorusią, więc promień wyszukiwania w praktyce łapał głównie
  // wyniki zza granicy, odrzucane przez filtr country_code w
  // geoapify.ts — zostawiało to za mało polskich trafień).
  Lasy: { lat: 52.33, lng: 20.55 },
  Rzeka: { lat: 53.0138, lng: 18.5981 }, // Toruń — nad Wisłą, największą polską rzeką
};

// Ostateczny fallback, gdy nie ma żadnego innego punktu odniesienia
// (np. pusta baza kuratorska i brak punktu startowego).
export const POLAND_CENTER: Coordinates = { lat: 52.0, lng: 19.0 };

export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type SubRegion = {
  id: string;
  title: string;
  summary: string;
  // Więcej niż jedna kotwica na podregion — polskie wybrzeże nie jest
  // prostą linią, więc jeden punkt + promień 45 km (patrz
  // TIGHT_COASTAL_RADIUS_METERS w getRoutePlaces.ts) nie objąłby np. i
  // Trójmiasta, i Helu, i całej Mierzei Wiślańskiej naraz — te leżą po
  // kolei jakieś 35-90 km od siebie. Każda kotwica to osobne zapytanie do
  // Geoapify (patrz getRoutePlaces.ts), a wyniki są łączone i tagowane
  // wspólnym ID podregionu.
  anchors: Coordinates[];
  // Twarda granica podregionu — NIEZALEŻNA od kotwic/promieni wyszukiwania.
  // Kotwica + promień to tylko heurystyka do WYSZUKIWANIA (Geoapify "bias"
  // niczego nie wyklucza, tylko preferuje) — nie daje twardej gwarancji, że
  // wynik faktycznie leży w tym podregionie, a nie w sąsiednim (np. wynik
  // znaleziony w promieniu od Władysławowa, ale realnie leżący już w
  // Trójmieście). `bounds` to ostateczny, osobny "strażnik" sprawdzany PO
  // wygenerowaniu całej trasy — patrz enforceSubRegionBounds w
  // generateRoute.ts — który odrzuca i zastępuje każdy punkt spoza tego
  // prostokąta, niezależnie od tego, skąd/jak został znaleziony.
  bounds: Bounds;
};

// Polskie wybrzeże rozciąga się na ok. 500 km (Świnoujście–Piaski przy
// granicy z Rosją) — jeden punkt-kotwica (REGION_TYPE_ANCHORS.Morze) i
// promień 60-90 km wystarczają na trasę 2-3-dniową, ale przy dłuższych
// podróżach (5-7+ dni) skupiają całą trasę na wąskim wycinku wybrzeża.
// Dla takich "rozciągniętych" typów regionu warianty trasy mają być
// geograficznie różne — każdy pokrywający inny odcinek — zamiast tylko
// różnić się tempem zwiedzania w tym samym miejscu. Góry i Jeziora nie
// mają tu wpisu: Tatry i Mazury są znacznie bardziej zwarte geograficznie,
// więc jeden punkt-kotwica wystarcza.
// Granice i kotwice poniżej wyznaczone są na podstawie realnych
// miejscowości leżących na trasie EuroVelo 10 / Velo Baltica wzdłuż
// polskiego wybrzeża — nie są to już orientacyjne, "z ręki" narysowane
// prostokąty. Każdy zakres to (współrzędne skrajnych miejscowości danego
// odcinka) ± mały bufor (0.02-0.05°), żeby te miejscowości nie wypadały
// tuż na granicy przez zwykłą niedokładność GPS. Współrzędne zweryfikowane
// indywidualnie (Wikipedia), bo poprzednia wersja miała realny błąd: stary
// maxLng Zachodniego wybrzeża (16.2) był węższy niż długość geograficzna
// Jarosławca (16.54) — jednej z miejscowości na tej trasie — więc
// enforceSubRegionBounds w generateRoute.ts realnie ją odrzucał.
export const COASTAL_SUB_REGIONS: SubRegion[] = [
  {
    id: "zachodnie-wybrzeze",
    title: "Zachodnie wybrzeże",
    summary: "Świnoujście – Kołobrzeg – Ustka",
    anchors: [
      { lat: 53.9099, lng: 14.2477 }, // Świnoujście
      { lat: 54.1752, lng: 15.5762 }, // Kołobrzeg
      { lat: 54.5403, lng: 16.5411 }, // Jarosławiec — bez tej kotwicy odcinek Darłowo-Ustka (~70 km) zostawał bez własnego punktu wyszukiwania
    ],
    // Południowo-zachodni róg: Świnoujście (53.9099, 14.2477) z buforem.
    // Północno-wschodni róg: Ustka (54.5805, 16.8614) z buforem — Ustka to
    // wspólny punkt zwrotny z podregionem środkowym (trasa "...→ Ustka" /
    // "Ustka →..."), więc obie granice CELOWO zachodzą na siebie wokół
    // 16.83-16.89, żeby Ustka mieściła się w obu wariantach.
    bounds: { minLat: 53.8, maxLat: 54.65, minLng: 14.15, maxLng: 16.89 },
  },
  {
    id: "srodkowe-wybrzeze",
    title: "Środkowe wybrzeże",
    summary: "Ustka – Rowy – Łeba – Karwia – Jastrzębia Góra – Chłapowo",
    anchors: [
      { lat: 54.5805, lng: 16.8614 }, // Ustka
      { lat: 54.7597, lng: 17.5536 }, // Łeba
      { lat: 54.8289, lng: 18.21 }, // Karwia — pokrywa wschodni odcinek (Sasino/Białogóra/Karwia/Jastrzębia Góra/Chłapowo)
    ],
    // Zachodnia granica (16.83) zachodzi na Zachodnie wybrzeże wokół Ustki
    // (patrz komentarz wyżej). Wschodnia (18.39) leży w połowie drogi
    // między Chłapowem (18.3714) a Władysławowem (18.4086) — to dwie
    // odrębne miejscowości, więc tu, w odróżnieniu od Ustki, granica NIE
    // zachodzi na sąsiedni wariant, tylko dzieli trasę dokładnie tam,
    // gdzie w opisie użytkownika kończy się środkowy odcinek, a zaczyna
    // wschodni.
    bounds: { minLat: 54.4, maxLat: 54.87, minLng: 16.83, maxLng: 18.39 },
  },
  {
    id: "wschodnie-wybrzeze",
    title: "Wschodnie wybrzeże",
    summary: "Władysławowo – Hel – Trójmiasto – Żuławy/Mierzeja Wiślana",
    anchors: [
      { lat: 54.79, lng: 18.4086 }, // Władysławowo — nasada Półwyspu Helskiego, początek odcinka
      { lat: 54.6053, lng: 18.8028 }, // Hel — czubek półwyspu
      { lat: 54.5189, lng: 18.5305 }, // Gdynia (Trójmiasto)
      { lat: 54.4317, lng: 19.6031 }, // Piaski/Nowa Karczma — koniec polskiej Mierzei Wiślanej przy granicy z Rosją
    ],
    // Zachodnia granica (18.39) to ten sam podział co maxLng Środkowego
    // wybrzeża (patrz komentarz wyżej). Wschodnia (19.65) z buforem tuż za
    // Piaskami/Nową Karczmą — ostatnią polską miejscowością na Mierzei
    // Wiślanej, ok. 4 km od granicy z Rosją. Południowa granica (54.28)
    // z buforem pod Stegną, najbardziej wysuniętą na południe z
    // miejscowości Żuław na tej trasie.
    bounds: { minLat: 54.28, maxLat: 54.83, minLng: 18.39, maxLng: 19.65 },
  },
];

export const SPREAD_REGION_SUB_REGIONS: Partial<Record<string, SubRegion[]>> = {
  Morze: COASTAL_SUB_REGIONS,
};
