import type { Place } from "@/data/places";
import type { NearbyPlaceWithDistance } from "@/lib/suggestBases";
import type { WeatherMood } from "@/lib/weather";

// Zgłoszenie 06.09 (ekran "Dziś w [baza]", wymóg 4): appka NIE MA żadnego
// prawdziwego pola wnętrze/plener — ani baza kuratorska w Supabase, ani
// dane Geoapify (które i tak nie są tu używane, patrz dzis/page.tsx) go
// nie mają. Poniższy podział to ŚWIADOME przybliżenie zbudowane z 8 tagów
// faktycznie używanych w kuratorskiej bazie (ten sam zestaw co CATEGORIES
// w SideDrawer.tsx) — nie jest doskonałe (np. "Historia" czasem oznacza
// plenerowe stanowisko archeologiczne, a "Zamki i Pałace" czasem tylko
// ruiny bez dachu), ale to najlepszy sygnał dostępny bez ręcznego
// tagowania wnętrze/plener dla każdego miejsca z osobna.
const INDOOR_TAGS = new Set([
  "Zamki i Pałace",
  "Historia",
  "Architektura",
  "Architektura sakralna",
]);
const OUTDOOR_TAGS = new Set(["Natura", "Parki Narodowe", "Jeziora", "Aktywność fizyczna", "Relaks"]);

function isIndoorPlace(place: Place): boolean {
  return place.tags.some((tag) => INDOOR_TAGS.has(tag));
}
function isOutdoorPlace(place: Place): boolean {
  return place.tags.some((tag) => OUTDOOR_TAGS.has(tag));
}

// Zgłoszenie 06.09, wymóg 5 (godziny otwarcia): sprawdzone bezpośrednio w
// prawdziwym API Geoapify (search + place-details, 5 realnych miejsc koło
// Łeby) — pole "opening_hours" bywa obecne w formacie OSM (np. "Mo-Su
// 10:00-21:00"), ale (a) tylko dla części obiektów, tam gdzie ktoś to
// otagował w OpenStreetMap — 1 z 5 sprawdzonych miejsc je miało, i (b)
// appka go dziś w ogóle nie pobiera/nie paruje (patrz geoapify.ts —
// GeoapifyDetailsFeature nie ma tego pola w typie). Co ważniejsze: ten
// ekran pokazuje WYŁĄCZNIE miejsca kuratorskie (getPlaces(), bez
// Geoapify — patrz dzis/page.tsx), a kuratorska tabela "places" w
// Supabase w ogóle nie ma kolumny na godziny otwarcia. Efekt: dla tego
// ekranu nie ma ŻADNYCH prawdziwych danych o godzinach otwarcia do
// wykorzystania. Zamiast zgadywać (np. zakładać "9-17" dla muzeów),
// ŚWIADOMIE POMIJAMY filtrowanie/oznaczanie po godzinach otwarcia —
// dodanie tego wymagałoby albo ręcznego uzupełnienia godzin w panelu
// admina (nowa kolumna), albo włączenia miejsc Geoapify do tego ekranu i
// parsowania formatu OSM (biblioteka typu opening_hours.js) — oba poza
// zakresem tego kroku.

export type PriorityReason = "rain-indoor" | "nice-outdoor" | "low-days-featured";

export type PrioritizedNearby = NearbyPlaceWithDistance & {
  priorityReason: PriorityReason | null;
};

// Próg, od którego appka traktuje podróż jako "na finiszu" i przestaje
// pokazywać wszystko wymieszane (wymóg 6) — poniżej tego progu liczy się
// tylko to, czy miejsce jest redakcyjnie oznaczone jako "featured"
// (sekcja "Polecane" w bocznym menu), nie pogoda.
const LOW_DAYS_THRESHOLD = 2;

// Ile dni podróży zostało, licząc OD DZISIAJ WŁĄCZNIE do końca
// zaplanowanego pobytu (data_rozpoczecia + liczba_dni - 1). Liczone na
// samych datach (bez godzin), żeby pora dnia sprawdzenia strony nie miała
// znaczenia. Nigdy nie zwraca wartości ujemnej — podróż, która się już
// zakończyła (ktoś nie kliknął jeszcze "Zakończ tę podróż"), pokazuje 0,
// żeby UI nie musiało się przed ujemną liczbą bronić osobno.
export function remainingTripDays(
  startDate: string,
  days: number,
  today: Date = new Date(),
): number {
  const start = new Date(`${startDate}T00:00:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const elapsedDays = Math.floor(
    (todayMidnight.getTime() - startMidnight.getTime()) / 86_400_000,
  );
  return Math.max(0, Math.min(days, days - elapsedDays));
}

// Ustala JEDEN aktywny tryb sortowania, nie łączy sygnałów — zgodnie z
// wymogiem 6 ("zamiast pokazywać wszystko wymieszane"): gdy dni jest mało,
// pogoda przestaje decydować o kolejności w ogóle, nie tylko traci
// pierwszeństwo dla pojedynczych miejsc.
type PriorityMode = "low-days" | "weather" | "distance";

function resolveMode(weatherMood: WeatherMood | null, remainingDays: number | null): PriorityMode {
  if (remainingDays !== null && remainingDays <= LOW_DAYS_THRESHOLD) return "low-days";
  if (weatherMood === "rain" || weatherMood === "nice") return "weather";
  return "distance";
}

function reasonFor(place: Place, mode: PriorityMode, weatherMood: WeatherMood | null): PriorityReason | null {
  if (mode === "low-days") return place.featured ? "low-days-featured" : null;
  if (mode === "weather") {
    if (weatherMood === "rain" && isIndoorPlace(place)) return "rain-indoor";
    if (weatherMood === "nice" && isOutdoorPlace(place)) return "nice-outdoor";
  }
  return null;
}

// Przepisuje kolejność `nearby` (przychodzi już posortowane rosnąco po
// odległości, patrz nearbyPlacesWithDistance) tak, żeby priorytetowe
// trafienia (patrz resolveMode/reasonFor) trafiły na górę — sortowanie
// STABILNE (Array.prototype.sort gwarantuje to od ES2019), więc w obrębie
// tej samej "rangi" zostaje oryginalna kolejność po odległości.
export function prioritizeForToday(
  nearby: NearbyPlaceWithDistance[],
  { weatherMood, remainingDays }: { weatherMood: WeatherMood | null; remainingDays: number | null },
): PrioritizedNearby[] {
  const mode = resolveMode(weatherMood, remainingDays);

  const withReason: PrioritizedNearby[] = nearby.map((entry) => ({
    ...entry,
    priorityReason: reasonFor(entry.place, mode, weatherMood),
  }));

  return withReason
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const rank = (r: PriorityReason | null) => (r ? 1 : 0);
      return rank(b.entry.priorityReason) - rank(a.entry.priorityReason) || a.index - b.index;
    })
    .map(({ entry }) => entry);
}

// Krótka notka wyświetlana nad listą na ekranie "Dziś w [baza]", żeby
// przestawienie kolejności nie wyglądało na przypadkowe — jawnie mówi
// użytkownikowi, WEDŁUG CZEGO appka dziś posortowała atrakcje.
export function describePriorityMode(
  weatherMood: WeatherMood | null,
  remainingDays: number | null,
): string | null {
  const mode = resolveMode(weatherMood, remainingDays);
  if (mode === "low-days") {
    return "Zostało mało dni — na górze najpierw najważniejsze, polecane atrakcje.";
  }
  if (mode === "weather" && weatherMood === "rain") {
    return "Pada — na górze najpierw atrakcje pod dachem.";
  }
  if (mode === "weather" && weatherMood === "nice") {
    return "Ładna pogoda — na górze najpierw atrakcje plenerowe.";
  }
  return null;
}
