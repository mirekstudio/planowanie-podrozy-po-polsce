import type { Place } from "@/data/places";
import { filterCandidates, type RouteOptions } from "@/lib/generateRoute";
import { distanceKm } from "@/lib/geo";
import { isWithinBounds, type Bounds } from "@/lib/poland";
import { getPlaceMapIcon } from "@/lib/placeMapIcon";

// Logika dla stylu podróży "Baza wypadowa" — CELOWO osobna od
// generateRoute.ts/generateRouteVariants.ts. Tamten algorytm (najbliższy
// sąsiad, podział na dni, warianty geograficzne) zakłada podróż objazdową
// odwiedzającą kolejne różne miejsca — dla bazy wypadowej pytanie jest
// inne ("gdzie zamieszkać, żeby mieć dużo w zasięgu", nie "w jakiej
// kolejności zwiedzać"), więc nie ma potrzeby, żeby te dwie ścieżki
// współdzieliły algorytm sortowania/podziału na dni. Korzysta tylko z
// filterCandidates (ten sam filtr zainteresowań/regionu co reszta appki)
// i zwykłej odległości — nigdy z orderByProximity/generateRoute.

export type BaseCandidate = {
  slug: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  image: string;
  imageAlt: string;
  imagePosition?: "center" | "top";
  source: "curated" | "basic";
  // Placeholder graficzny dopasowany do kategorii — patrz Place.basicPlaceIcon.
  basicPlaceIcon?: string;
  // Zgłoszenie 05.09 (mapy z ikonami kategorii): ikona do pokazania na
  // PINEZCE mapy (nie na karcie) — patrz getPlaceMapIcon. W przeciwieństwie
  // do basicPlaceIcon (tylko dla "basic", bo curated i tak ma zdjęcie na
  // karcie) ta ikona jest liczona dla KAŻDEGO kandydata, curated i basic,
  // bo mapa nigdy nie pokazuje zdjęcia — tylko pinezkę.
  mapIcon: string;
  nearbyCount: number;
  radiusKm: number;
};

// Promień "w zasięgu bazy" — dojazd autem w jedną stronę bez poświęcania
// całego dnia na sam przejazd (spójne z MAX_DISTANCE_KM dla noclegów w
// accommodation.ts, tam z tego samego powodu).
export const BASE_SEARCH_RADIUS_KM = 30;

// Dwie proponowane bazy nie mogą leżeć praktycznie w tym samym miejscu
// (np. dwie plaże w tej samej miejscowości) — to nie są dwie różne
// sensowne propozycje, tylko duplikat. Stosowany TYLKO do miejsc "basic"
// (Geoapify) — patrz komentarz przy suggestBaseCandidates niżej: dane z
// Geoapify nie przechodzą redakcyjnej weryfikacji i realnie potrafią się
// dublować (cała historia filtrów w geoapify.ts), więc tu ta ochrona
// nadal ma sens.
const MIN_DISTANCE_BETWEEN_BASES_KM = 40;

const MAX_BASE_CANDIDATES = 4;
const MIN_BASE_CANDIDATES_BEFORE_FALLBACK = 2;

// Promień domyślny i zakres suwaka na tymczasowym widoku szczegółów bazy
// (/planer/baza) — patrz BaseRadiusExplorer.tsx. Osobne od
// BASE_SEARCH_RADIUS_KM (który steruje TYLKO doborem/oceną kandydatów na
// listach wyżej) — tu chodzi o to, ile użytkownik faktycznie chce
// przejechać z konkretnej, już wybranej bazy, i to on o tym decyduje.
export const DETAIL_MIN_RADIUS_KM = 5;
export const DETAIL_MAX_RADIUS_KM = 50;
export const DETAIL_DEFAULT_RADIUS_KM = 15;

function countNearby(pool: Place[], center: Place, radiusKm: number): number {
  return pool.filter(
    (other) => other.slug !== center.slug && distanceKm(center, other) <= radiusKm,
  ).length;
}

// Zgłoszenie 05.09: "Słowiński Park Narodowy" pojawiał się jako propozycja
// BAZY wypadowej — błąd koncepcyjny. Park narodowy/rezerwat to obszar
// chroniony bez infrastruktury noclegowej, ATRAKCJA do której się jedzie,
// nie miejscowość, z której się wyrusza. Dwa niezależne sygnały (ten sam
// wzorzec co looksLikeNonTouristPlace/looksLikeGenericBeachAccessPoint w
// geoapify.ts): tag "Parki Narodowe" — precyzyjny dla naszych dwóch
// kuratorskich parków (sprawdzone wprost w bazie: Słowiński i
// Wielkopolski, żadnych innych) — oraz nazwa, na wypadek gdyby podobny
// obszar trafił się kiedyś z Geoapify (dane "basic" nie niosą naszych
// tagów, patrz toBasicPlace w getRoutePlaces.ts). Wyklucza z bycia
// KANDYDATEM na bazę, ale NIE z puli używanej do liczenia gęstości
// (`pool` niżej) — park narodowy w pobliżu nadal powinien podnosić
// atrakcyjność INNEJ, prawdziwej miejscowości jako bazy, i nadal pojawia
// się jako atrakcja w promieniu wybranej bazy (patrz nearbyPlacesWithDistance).
const PROTECTED_AREA_NAME_PATTERN = /park narodowy|rezerwat przyrody|obszar chroniony/i;

function isProtectedArea(place: Place): boolean {
  return place.tags.includes("Parki Narodowe") || PROTECTED_AREA_NAME_PATTERN.test(place.title);
}

// Wybiera do MAX_BASE_CANDIDATES kandydatów na bazę wypadową spośród
// `places`: miejsca z największą "gęstością" innych pasujących miejsc w
// promieniu BASE_SEARCH_RADIUS_KM — to one najlepiej nadają się na
// centralny punkt noclegowy.
//
// PRIORYTET dla naszych miejsc kuratorskich (zgłoszenie 05.09: Łeba, mimo
// pełnego opisu redakcyjnego i wysokiej gęstości, znikała z propozycji
// tylko dlatego, że leżała ~27 km od już wybranego Rowy — obie to jednak
// dwie różne, w pełni opisane kuratorskie miejscowości, nie duplikat).
// Dlatego kuratorskie miejsca NIGDY nie wykluczają się nawzajem po
// odległości — każde było już indywidualnie zweryfikowane redakcyjnie,
// więc ufamy, że to realnie różne propozycje, nawet blisko siebie na
// wąskim pasie wybrzeża. Miejsca "basic" (Geoapify) uzupełniają wolne
// miejsca na liście TYLKO gdy kuratorskich jest za mało, i tam odległość
// od już wybranych (patrz MIN_DISTANCE_BETWEEN_BASES_KM) nadal się liczy
// — te dane nie przechodzą redakcyjnej weryfikacji i realnie potrafią się
// dublować.
export function suggestBaseCandidates(
  places: Place[],
  options: Pick<RouteOptions, "interests" | "regionTypes" | "surroundings" | "nearbyAttractions">,
): BaseCandidate[] {
  const matching = filterCandidates(places, options);
  // Ten sam kompromis co MIN_MATCHING_CURATED_PLACES w getRoutePlaces.ts —
  // gdy filtr zainteresowań zostawia za mało miejsc, żeby cokolwiek ocenić,
  // lepiej zaproponować bazy z całej puli niż nie zaproponować niczego.
  const pool = matching.length >= MIN_BASE_CANDIDATES_BEFORE_FALLBACK ? matching : places;

  const scored = pool
    .map((place) => ({ place, nearbyCount: countNearby(pool, place, BASE_SEARCH_RADIUS_KM) }))
    // Parki narodowe/rezerwaty odpadają TYLKO tutaj (z bycia kandydatem) —
    // `pool` powyżej, użyty do liczenia nearbyCount, zostaje pełny, więc
    // park w pobliżu nadal podbija atrakcyjność sąsiedniej, prawdziwej
    // miejscowości.
    .filter(({ place }) => !isProtectedArea(place))
    .sort((a, b) => b.nearbyCount - a.nearbyCount);

  const curatedScored = scored.filter((c) => c.place.source !== "basic");
  const basicScored = scored.filter((c) => c.place.source === "basic");

  const selected: { place: Place; nearbyCount: number }[] = [];

  for (const candidate of curatedScored) {
    if (selected.length >= MAX_BASE_CANDIDATES) break;
    selected.push(candidate);
  }

  for (const candidate of basicScored) {
    if (selected.length >= MAX_BASE_CANDIDATES) break;
    const tooCloseToExisting = selected.some(
      (s) => distanceKm(s.place, candidate.place) < MIN_DISTANCE_BETWEEN_BASES_KM,
    );
    if (tooCloseToExisting) continue;
    selected.push(candidate);
  }

  return selected.map(({ place, nearbyCount }) => ({
    slug: place.slug,
    title: place.title,
    description: place.description,
    lat: place.lat,
    lng: place.lng,
    image: place.image,
    imageAlt: place.imageAlt,
    imagePosition: place.imagePosition,
    source: place.source ?? "curated",
    basicPlaceIcon: place.basicPlaceIcon,
    mapIcon: getPlaceMapIcon(place),
    nearbyCount,
    radiusKm: BASE_SEARCH_RADIUS_KM,
  }));
}

export type NearbyPlaceWithDistance = { place: Place; distanceKm: number };

// Miejsca "w zasięgu" wybranej bazy, z dystansem, posortowane od
// najbliższego, do pokazania na tymczasowym widoku /planer/baza — patrz
// BaseRadiusExplorer.tsx. Liczy raz, do DETAIL_MAX_RADIUS_KM (górny koniec
// suwaka), żeby przesuwanie suwaka na kliencie mogło tylko FILTROWAĆ już
// policzoną listę, bez ponownego przeliczania odległości ani nowego
// zapytania do serwera przy każdym ruchu suwaka.
export function nearbyPlacesWithDistance(
  places: Place[],
  base: { slug: string; lat: number; lng: number },
  maxRadiusKm: number = DETAIL_MAX_RADIUS_KM,
): NearbyPlaceWithDistance[] {
  return places
    .filter((p) => p.slug !== base.slug)
    .map((place) => ({ place, distanceKm: distanceKm(base, place) }))
    .filter((entry) => entry.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Ogranicza pulę do jednego podregionu wybrzeża (Zachodnie/Środkowe/
// Wschodnie) — CELOWA, osobna kopia identycznej reguły przynależności co
// withinSubRegion w generateRoute.ts (miejsca "basic" po tagu regionu z
// getRoutePlaces.ts, miejsca kuratorskie po odległości od kotwic
// podregionu), a NIE import z generateRoute.ts — patrz komentarz na górze
// pliku: ta ścieżka ma zostać w 100% niezależna od pliku z algorytmem
// najbliższego sąsiada, nawet kosztem odrobiny duplikacji.
const CURATED_SUB_REGION_RADIUS_KM = 120;

// Promień 120 km wokół kotwic (jak wyżej) sam w sobie jest CELOWO luźny —
// sąsiednie podregiony (np. Środkowe/Zachodnie) leżą bliżej siebie niż
// 120 km, więc same kotwice/promień potrafią złapać miejsce z SĄSIEDNIEGO
// podregionu (zaobserwowane na żywo: Kołobrzeg — kotwica Zachodniego —
// wpadał też do puli Środkowego). W generateRoute.ts to koryguje osobny,
// twardy strażnik (enforceSubRegionBounds) PO ułożeniu trasy; tu, bez
// takiego etapu, granica `bounds` musi być sprawdzona od razu, dla
// WSZYSTKICH miejsc (kuratorskich i "basic" — tag regionu w danych też
// może się mylić, patrz ten sam komentarz w generateRoute.ts).
// Zgłoszenie 05.09 (mapy z ikonami kategorii): `icon` domyślnie neutralne
// 📍 dla fallbackowych kotwic (bez przypisanego konkretnego miejsca, patrz
// niżej) — realne kandydaci zawsze niosą swoje mapIcon z BaseCandidate.
export type PreviewPin = { lat: number; lng: number; title: string; icon: string };

// Miniatura mapy na Poziomie 1 (wybór podregionu) ma pokazywać to, co
// USER FAKTYCZNIE zobaczy po kliknięciu — nie stałe, orientacyjne kotwice
// z poland.ts (używane gdzie indziej wyłącznie do wyznaczania promienia
// wyszukiwania Geoapify, patrz SubRegion.anchors). Zgłoszenie 05.09
// (pierwsza część): mapa pokazywała 3 kotwice, a lista kart niżej — inną
// liczbę i inne miejsca, bo to dwa niezależne źródła danych.
//
// Zgłoszenie 05.09 (druga kontynuacja): NAWET realne kuratorskie miejsca
// nie wystarczały — funkcja sama filtrowała po granicach i parkach
// narodowych (`isProtectedArea`, patrz historia gita), czyli była TRZECIM,
// osobnym doborem miejsc, niezależnym od suggestBaseCandidates, które
// faktyczne wybiera kandydatów na Poziomie 2 (gęstość sąsiadów,
// priorytet kuratorskich, MAX_BASE_CANDIDATES...). Dwa niezależne dobory
// tego samego zbioru nieuchronnie prędzej czy później się rozjadą.
//
// Rozwiązanie: ta funkcja NIE dobiera już niczego sama — przyjmuje
// gotowe `BaseCandidate[]` z suggestBaseCandidates (wywołanego dla
// KAŻDEGO podregionu dokładnie tak samo jak dla wybranego podregionu na
// Poziomie 2, patrz /planer/bazy/page.tsx) i mapuje WSZYSTKIE (bez
// żadnego limitu/slice) na piny — Poziom 1 pokazuje więc dokładnie te
// same miejsca, w tej samej liczbie, co pełna lista kart o piętro niżej.
// Wyklucza to jednocześnie parki narodowe bez osobnego filtra: skoro
// suggestBaseCandidates już ich nie zwraca, nie mogą trafić i tutaj.
//
// Zwraca `title` (nie same współrzędne) — podpis tekstowy pod miniaturą
// MUSI być zbudowany z TYCH SAMYCH obiektów co pineski na mapie (patrz
// subRegionCaption w /planer/bazy/page.tsx), inaczej liczba wymienionych
// miejscowości w tekście mogłaby się rozjechać z liczbą pinesek.
//
// Fallback na kotwice (bez tytułów) zdarza się tylko wtedy, gdy dla
// danego podregionu suggestBaseCandidates nie zwróciło ŻADNEGO
// kandydata — nie powinno się zdarzyć dla obsługiwanych dziś podregionów
// wybrzeża, ale miniatura nigdy nie zostaje wtedy pusta.
export function pinsFromBaseCandidates(
  candidates: BaseCandidate[],
  fallbackAnchors: { lat: number; lng: number }[],
): PreviewPin[] {
  const pins = candidates.map((c) => ({ lat: c.lat, lng: c.lng, title: c.title, icon: c.mapIcon }));
  return pins.length > 0 ? pins : fallbackAnchors.map((a) => ({ ...a, title: "", icon: "📍" }));
}

export function restrictToSubRegion(
  places: Place[],
  subRegionId: string,
  anchors: { lat: number; lng: number }[],
  bounds: Bounds,
): Place[] {
  return places
    .filter((place) =>
      place.source === "basic"
        ? place.region === subRegionId
        : anchors.some((anchor) => distanceKm(anchor, place) <= CURATED_SUB_REGION_RADIUS_KM),
    )
    .filter((place) => isWithinBounds({ lat: place.lat, lng: place.lng }, bounds));
}
