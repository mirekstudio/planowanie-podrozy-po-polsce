import { geoapifyProvider } from "./geoapify";
import type { PlacesProvider } from "./types";

// Aktywny dostawca danych zewnętrznych o miejscach. Żeby dodać kolejne
// źródło (np. Google Places), zaimplementuj `PlacesProvider` w nowym
// pliku obok `geoapify.ts` i podmień (lub rozszerz) poniższy eksport —
// reszta appki (getRoutePlaces, UI) nie wymaga żadnych zmian.
export const activePlacesProvider: PlacesProvider = geoapifyProvider;

export type { ExternalPlaceResult, PlacesProvider, PlacesProviderParams } from "./types";

// Chroniona, współdzielona funkcja niskiego poziomu — jedyne miejsce w
// appce, które powinno rozmawiać z Geoapify /v2/places (patrz komentarz
// przy definicji w geoapify.ts). Reużywana przez getRoutePlaces.ts,
// getCategoryPlaces.ts (pośrednio, przez fetchPlaces) i accommodation.ts.
export { fetchProtectedPlaces, type FetchProtectedPlacesParams } from "./geoapify";
