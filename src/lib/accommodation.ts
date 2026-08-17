import type { Nocleg, NoclegTyp, PoziomKomfortu } from "@/data/noclegi";
import type { Coordinates, RouteDay } from "@/lib/generateRoute";
import { distanceKm } from "@/lib/geo";

// Wybór w formularzu planera — "hotel_pensjonat" łączy dwa typy z tabeli
// noclegi (hotel/pensjonat), bo dla użytkownika to jedna, wspólna
// kategoria ("nocleg pod dachem"), nie dwie osobne.
export const ACCOMMODATION_TYPE_OPTIONS = [
  { value: "kemping", label: "Duży kemping" },
  { value: "pole namiotowe", label: "Małe pole namiotowe" },
  { value: "hotel_pensjonat", label: "Hotel / pensjonat" },
] as const;
export type AccommodationTypePreference =
  (typeof ACCOMMODATION_TYPE_OPTIONS)[number]["value"];

export type AccommodationOption = {
  id: string;
  nazwa: string;
  // NoclegTyp dla propozycji z naszej bazy, swobodny polski opis
  // ("nocleg") dla propozycji dociągniętej z Geoapify — dostawca
  // zewnętrzny nie zna naszej taksonomii typów.
  typ: NoclegTyp | "nocleg";
  lat: number;
  lng: number;
  distanceKm: number;
  udogodnienia: string | null;
  poziomKomfortu: PoziomKomfortu | null;
  // Ta sama konwencja co Place.source — patrz src/data/places.ts.
  source: "curated" | "basic";
  sourceUrl: string | null;
};

// "Rozsądna odległość" od ostatniego przystanku dnia (patrz zgłoszenie,
// punkt 3) — wystarczająco blisko, żeby dojazd do noclegu nie zjadał
// istotnej części wieczoru, ale szeroko wystarczająco, żeby objąć
// najbliższe miasteczko z hotelem, gdy sam punkt trasy leży na uboczu.
const MAX_DISTANCE_KM = 20;

// Premia (w km) odejmowana od dystansu kempingów z przyłączami przy
// podróży camperem — ten sam mechanizm co FOCUS_BONUS_KM w
// generateRoute.ts, żeby w tej samej odległości wygrywały z hotelem czy
// polem bez przyłączy.
const CAMPER_HOOKUP_BONUS_KM = 10;

function matchesPreference(
  typ: NoclegTyp,
  preference: AccommodationTypePreference | undefined,
): boolean {
  if (!preference) return true;
  if (preference === "hotel_pensjonat") return typ === "hotel" || typ === "pensjonat";
  return typ === preference;
}

// Prosta heurystyka tekstowa zamiast osobnej kolumny w bazie — pole
// "udogodnienia" jest wolnym tekstem (patrz supabase/add_noclegi.sql), a
// wzmianka o przyłączach jest w praktyce jedynym sygnałem, że dany
// kemping realnie obsługuje kampery/przyczepy, a nie tylko namioty.
function hasCamperHookups(nocleg: Nocleg): boolean {
  return Boolean(nocleg.udogodnienia?.toLowerCase().includes("przyłącz"));
}

function scoreCandidate(
  nocleg: Nocleg,
  point: Coordinates,
  transport: "car" | "camper",
): number {
  const distance = distanceKm(point, nocleg);
  if (transport === "camper" && nocleg.typ === "kemping" && hasCamperHookups(nocleg)) {
    return Math.max(0, distance - CAMPER_HOOKUP_BONUS_KM);
  }
  return distance;
}

function toOption(nocleg: Nocleg, point: Coordinates): AccommodationOption {
  return {
    id: nocleg.id,
    nazwa: nocleg.nazwa,
    typ: nocleg.typ,
    lat: nocleg.lat,
    lng: nocleg.lng,
    distanceKm: distanceKm(point, nocleg),
    udogodnienia: nocleg.udogodnienia,
    poziomKomfortu: nocleg.poziomKomfortu,
    source: "curated",
    sourceUrl: null,
  };
}

export type AccommodationMatchOptions = {
  transport: "car" | "camper";
  accommodationType?: AccommodationTypePreference;
};

// Zwraca do `limit` najlepiej dopasowanych noclegów z naszej bazy w
// promieniu MAX_DISTANCE_KM od `point`, posortowanych wg scoreCandidate
// (odległość, z premią dla kempingów z przyłączami przy kamperze).
export function pickCuratedAccommodation(
  point: Coordinates,
  noclegi: Nocleg[],
  options: AccommodationMatchOptions,
  limit = 3,
): AccommodationOption[] {
  const withinRadius = noclegi.filter((n) => distanceKm(point, n) <= MAX_DISTANCE_KM);
  const preferred = withinRadius.filter((n) =>
    matchesPreference(n.typ, options.accommodationType),
  );
  // Gdy preferowany typ nie ma dopasowania w promieniu, luzujemy filtr
  // typu, ale zostajemy w promieniu — lepiej pokazać najbliższy hotel
  // niż wymarzony kemping 80 km dalej (patrz punkt 3 zgłoszenia).
  const pool = preferred.length > 0 ? preferred : withinRadius;

  return pool
    .map((nocleg) => ({ nocleg, score: scoreCandidate(nocleg, point, options.transport) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ nocleg }) => toOption(nocleg, point));
}

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY ?? "";
const PLACES_URL = "https://api.geoapify.com/v2/places";

function resolveFallbackCategories(
  accommodationType: AccommodationTypePreference | undefined,
  transport: "car" | "camper",
): string[] {
  if (accommodationType === "kemping" || accommodationType === "pole namiotowe") {
    return ["camping.camp_site", "camping.caravan_site"];
  }
  if (accommodationType === "hotel_pensjonat") {
    return ["accommodation.hotel", "accommodation.guest_house"];
  }
  // Brak wyraźnej preferencji w formularzu — kierujemy się środkiem
  // transportu, tak samo jak w scoreCandidate dla noclegów kuratorskich.
  return transport === "camper"
    ? ["camping.camp_site", "camping.caravan_site", "accommodation"]
    : ["accommodation.hotel", "accommodation.guest_house", "camping.camp_site"];
}

function guessTypeFromCategories(categories: string[] | undefined): NoclegTyp | "nocleg" {
  const cats = categories ?? [];
  if (cats.some((c) => c.startsWith("camping"))) return "kemping";
  if (cats.some((c) => c.includes("hotel"))) return "hotel";
  if (cats.some((c) => c.includes("guest_house"))) return "pensjonat";
  return "nocleg";
}

type GeoapifyPlaceFeature = {
  properties: {
    place_id: string;
    name?: string;
    lat: number;
    lon: number;
    categories?: string[];
  };
};

// Dociąga jedną propozycję noclegu z Geoapify, gdy w promieniu nie ma
// żadnej pasującej pozycji w naszej bazie (patrz punkt 3 zgłoszenia).
// Zwraca "podstawową" (source: "basic") propozycję, zgodnie z tą samą
// konwencją co miejsca z src/lib/getRoutePlaces.ts.
async function fetchAccommodationFallback(
  point: Coordinates,
  options: AccommodationMatchOptions,
): Promise<AccommodationOption | null> {
  if (!GEOAPIFY_API_KEY) return null;

  const categories = resolveFallbackCategories(options.accommodationType, options.transport);
  const radiusMeters = MAX_DISTANCE_KM * 1000;

  try {
    const url =
      `${PLACES_URL}?categories=${encodeURIComponent(categories.join(","))}` +
      `&filter=circle:${point.lng},${point.lat},${radiusMeters}` +
      `&bias=proximity:${point.lng},${point.lat}` +
      `&limit=5&lang=pl&apiKey=${GEOAPIFY_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const features = (data.features ?? []) as GeoapifyPlaceFeature[];
    // Geoapify sortuje wyniki wg "bias" — pierwszy nazwany wynik jest
    // najbliższym pasującym obiektem.
    const best = features.find((f) => f.properties.name);
    if (!best) return null;

    const resultPoint = { lat: best.properties.lat, lng: best.properties.lon };

    return {
      id: `geoapify-${best.properties.place_id}`,
      nazwa: best.properties.name!,
      typ: guessTypeFromCategories(best.properties.categories),
      lat: resultPoint.lat,
      lng: resultPoint.lng,
      distanceKm: distanceKm(point, resultPoint),
      udogodnienia: null,
      poziomKomfortu: null,
      source: "basic",
      sourceUrl: null,
    };
  } catch {
    // Sieć/Geoapify niedostępne — po prostu nie proponujemy noclegu dla
    // tego dnia, tak jak przy braku dopasowania w promieniu.
    return null;
  }
}

// Zwraca propozycje noclegu dla jednego punktu (ostatniego przystanku
// dnia): najpierw z naszej bazy, a jeśli w promieniu nie ma żadnej,
// dociąga jedną z Geoapify.
export async function getAccommodationOptions(
  point: Coordinates,
  noclegi: Nocleg[],
  options: AccommodationMatchOptions,
): Promise<AccommodationOption[]> {
  const curated = pickCuratedAccommodation(point, noclegi, options, 3);
  if (curated.length > 0) return curated;

  const fallback = await fetchAccommodationFallback(point, options);
  return fallback ? [fallback] : [];
}

export type RouteDayWithAccommodation = RouteDay & {
  accommodationOptions: AccommodationOption[];
};

// Dokłada propozycje noclegu do każdego dnia trasy — tylko dla dni z co
// najmniej jednym przystankiem (dzień wolny nie ma "ostatniego
// przystanku", więc nie ma od czego liczyć odległości).
export async function attachAccommodationOptions(
  days: RouteDay[],
  noclegi: Nocleg[],
  options: AccommodationMatchOptions,
): Promise<RouteDayWithAccommodation[]> {
  return Promise.all(
    days.map(async (day) => {
      const lastStop = day.places[day.places.length - 1];
      if (!lastStop) return { ...day, accommodationOptions: [] };

      const accommodationOptions = await getAccommodationOptions(
        { lat: lastStop.lat, lng: lastStop.lng },
        noclegi,
        options,
      );
      return { ...day, accommodationOptions };
    }),
  );
}
