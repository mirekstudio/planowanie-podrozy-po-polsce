import { MAPBOX_TOKEN } from "@/lib/mapbox";
import type { Coordinates } from "@/lib/generateRoute";

const START_PIN_COLOR = "16a34a";
const STOP_PIN_COLOR = "111111";

// Lekka, statyczna miniatura trasy (Mapbox Static Images API) do kart
// wariantów — bez ładowania pełnej interaktywnej mapy (mapbox-gl) dla
// każdej z maks. 3 kart naraz.
export function buildRouteThumbnailUrl(
  stops: Coordinates[],
  startPoint: Coordinates | null | undefined,
  width = 400,
  height = 200,
): string | null {
  if (!MAPBOX_TOKEN) return null;

  const points: { coords: Coordinates; color: string }[] = [
    ...(startPoint ? [{ coords: startPoint, color: START_PIN_COLOR }] : []),
    ...stops.map((coords) => ({ coords, color: STOP_PIN_COLOR })),
  ];

  if (points.length === 0) return null;

  const markers = points
    .map(
      ({ coords, color }) =>
        `pin-s+${color}(${coords.lng.toFixed(5)},${coords.lat.toFixed(5)})`,
    )
    .join(",");

  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markers}/auto/${width}x${height}@2x?padding=30&access_token=${MAPBOX_TOKEN}`;
}
