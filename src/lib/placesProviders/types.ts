import type { Coordinates } from "@/lib/generateRoute";

// Znormalizowany wynik z zewnętrznego źródła miejsc — niezależny od
// konkretnego API, żeby reszta appki (konwersja na Place, UI) nie
// musiała znać szczegółów żadnego konkretnego dostawcy.
export type ExternalPlaceResult = {
  externalId: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  image: string | null;
  imageAlt: string;
  sourceUrl: string | null;
  // Surowe kategorie dostawcy (np. Geoapify: "accommodation.hotel",
  // "camping.camp_site") — opcjonalne, bo nie każdy dostawca je zwraca.
  // Używane tam, gdzie konsument wyniku musi zgadnąć typ miejsca po fakcie
  // (patrz guessTypeFromCategories w accommodation.ts), skoro ExternalPlaceResult
  // celowo nie zna żadnej konkretnej taksonomii dostawcy.
  categories?: string[];
  // Zgłoszenie 05.09: neutralny emoji dopasowany do typu miejsca (patrz
  // getCategoryDisplay w placesProviders/geoapifyCategoryDisplay.ts) — do
  // pokazania na karcie, gdy `image` jest puste, zamiast jednej
  // uniwersalnej pinezki dla WSZYSTKICH miejsc "podstawowych". Zawsze
  // ustawione przez dostawcę (nigdy undefined) — konkretny dostawca może
  // nie mieć kategorii, ale wtedy i tak zwraca neutralny domyślny emoji.
  icon: string;
};

// Miejsce kuratorskie, którego provider powinien unikać w wynikach — samych
// współrzędnych (patrz MIN_DISTANCE_FROM_CURATED_KM w geoapify.ts) nie
// wystarczy, gdy to samo realne miejsce jest duże (np. cały park narodowy):
// punkt reprezentacyjny w danych dostawcy (np. węzeł OSM gdzieś w środku
// parku) bywa oddalony od naszego kuratorskiego punktu (np. siedziba/wejście)
// o więcej niż promień wykluczenia, mimo że to dokładnie ten sam obiekt.
// `title` daje drugi, niezależny sygnał dedupikacji (po nazwie, nie tylko po
// odległości) — patrz zgłoszenie 23.08 (Słowiński/Wielkopolski Park
// Narodowy pokazywały się podwójnie: raz kuratorsko, raz jako "Odkryj
// więcej" z Geoapify).
export type ExcludedPlace = Coordinates & { title: string };

export type PlacesProviderParams = {
  center: Coordinates;
  radiusMeters: number;
  interests: string[];
  limit: number;
  // Miejsca (np. kuratorskie), których provider powinien unikać, żeby nie
  // dublować tego, co już mamy w bazie — patrz ExcludedPlace.
  exclude: ExcludedPlace[];
  // Opcjonalnie — typ_regionu, dla którego szukamy (np. "Morze"). Dostawca
  // może to wykorzystać, żeby dobrać trafniejsze kategorie (patrz np.
  // rozszerzenie kategorii dla kombinacji Morze+Relaks w geoapify.ts).
  regionTypes?: string[];
};

// Wspólny interfejs dla każdego dostawcy danych o miejscach spoza naszej
// bazy Supabase. Dodanie nowego źródła (np. Google Places) = nowy plik
// implementujący ten interfejs + zarejestrowanie go w providers/index.ts,
// bez zmian w reszcie appki (getRoutePlaces, UI).
export interface PlacesProvider {
  id: string;
  // Atrybucja danych — zależy od dostawcy (np. OpenStreetMap dla
  // Geoapify), więc nie może być zaszyta na stałe poza providerem.
  attribution: { author: string; license: string };
  fetchPlaces(params: PlacesProviderParams): Promise<ExternalPlaceResult[]>;
  // Opcjonalne — dociąga na żywo szczegóły pojedynczego miejsca po jego
  // ID u tego dostawcy. Używane przez stronę szczegółów dla miejsc
  // "podstawowych" (bez własnego rekordu w Supabase — ich dane nigdzie
  // nie są zapisywane, więc trzeba je odpytać ponownie). Dostawca może
  // tego nie obsługiwać (brak odpowiedniego endpointu) — wtedy po prostu
  // nie definiuje tej metody.
  fetchPlaceDetails?(externalId: string): Promise<ExternalPlaceResult | null>;
}
