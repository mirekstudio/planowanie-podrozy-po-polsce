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
};

export type PlacesProviderParams = {
  center: Coordinates;
  radiusMeters: number;
  interests: string[];
  limit: number;
  // Punkty (np. miejsca kuratorskie), których sąsiedztwa provider
  // powinien unikać, żeby nie dublować tego, co już mamy w bazie.
  exclude: Coordinates[];
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
