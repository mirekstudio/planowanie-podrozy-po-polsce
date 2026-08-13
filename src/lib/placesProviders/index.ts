import { geoapifyProvider } from "./geoapify";
import type { PlacesProvider } from "./types";

// Aktywny dostawca danych zewnętrznych o miejscach. Żeby dodać kolejne
// źródło (np. Google Places), zaimplementuj `PlacesProvider` w nowym
// pliku obok `geoapify.ts` i podmień (lub rozszerz) poniższy eksport —
// reszta appki (getRoutePlaces, UI) nie wymaga żadnych zmian.
export const activePlacesProvider: PlacesProvider = geoapifyProvider;

export type { ExternalPlaceResult, PlacesProvider, PlacesProviderParams } from "./types";
