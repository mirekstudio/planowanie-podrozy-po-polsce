import { MAPBOX_TOKEN } from "@/lib/mapbox";

export type GeocodedPlace = {
  lat: number;
  lng: number;
  label: string;
};

// Poniżej tej wartości Mapbox uznaje dopasowanie za na tyle słabe, że
// lepiej pokazać "nie znaleziono" niż podstawić przypadkowy, niepasujący
// wynik (np. wpisanie adresu w Szwajcarii bez tego sprawdzenia potrafiło
// po cichu zwrócić zupełnie inny adres w Polsce).
const MIN_RELEVANCE = 0.5;

export async function geocodeForward(
  query: string,
): Promise<GeocodedPlace | null> {
  if (!query.trim() || !MAPBOX_TOKEN) return null;

  // Celowo bez ograniczenia &country=pl — appka planuje trasy po
  // Polsce, ale punkt startowy może być realnym miejscem użytkownika
  // gdziekolwiek (np. w Szwajcarii), skąd wyruszy w podróż do Polski.
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query,
  )}.json?access_token=${MAPBOX_TOKEN}&language=pl&limit=1`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  if (
    typeof feature.relevance === "number" &&
    feature.relevance < MIN_RELEVANCE
  ) {
    return null;
  }

  const [lng, lat] = feature.center;
  return { lat, lng, label: feature.place_name as string };
}

export async function geocodeReverse(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=pl&limit=1`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  return feature.place_name as string;
}
