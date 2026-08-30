import type { Coordinates } from "@/lib/generateRoute";
import { distanceKm } from "@/lib/geo";
import { POLAND_BOUNDS } from "@/lib/poland";
import type {
  ExternalPlaceResult,
  PlacesProvider,
  PlacesProviderParams,
} from "./types";

// Klucz jest tylko po stronie serwera (bez prefiksu NEXT_PUBLIC_) — ten
// moduł jest wywoływany wyłącznie z komponentów serwerowych, więc klucz
// nigdy nie trafia do przeglądarki.
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY ?? "";
const PLACES_URL = "https://api.geoapify.com/v2/places";
const PLACE_DETAILS_URL = "https://api.geoapify.com/v2/place-details";

const MIN_DISTANCE_FROM_CURATED_KM = 1;
const MAX_DETAIL_LOOKUPS = 24;

// Mapowanie naszych kategorii zainteresowań (z formularza planera i z
// kategorii przeglądania w bocznym menu) na kategorie turystyczne
// Geoapify — https://apidocs.geoapify.com/docs/places/#categories
// To dopasowanie heurystyczne: Geoapify ma znacznie bogatszą,
// hierarchiczną taksonomię, tu bierzemy najbliższe odpowiedniki.
const INTEREST_TO_GEOAPIFY_CATEGORIES: Record<string, string[]> = {
  Historia: [
    "tourism.sights",
    "heritage",
    "tourism.sights.memorial",
    "tourism.sights.archaeological_site",
    "tourism.sights.battlefield",
  ],
  Natura: ["natural", "national_park", "leisure.park.nature_reserve"],
  Architektura: [
    "tourism.sights.building",
    "tourism.sights.castle",
    "tourism.sights.manor",
    "building.historic",
  ],
  "Zamki i Pałace": [
    "tourism.sights.castle",
    "tourism.sights.manor",
    "tourism.sights.fort",
  ],
  "Parki Narodowe": ["national_park", "natural.protected_area"],
  Jeziora: ["natural.water", "natural.water.bay"],
  "Aktywność fizyczna": ["sport", "leisure.park", "entertainment.activity_park"],
  "Architektura sakralna": [
    "tourism.sights.place_of_worship",
    "religion.place_of_worship",
    "heritage",
  ],
  Relaks: ["leisure.park", "leisure.spa", "beach", "natural.water"],
};

const DEFAULT_CATEGORIES = ["tourism.sights", "tourism.attraction", "heritage", "natural"];

// Dla kombinacji "Morze" + "Relaks" sam interest-owy zestaw dla Relaks
// (leisure.park, leisure.spa, beach, natural.water) jest zbyt ogólny —
// w praktyce zwracał przypadkowe atrakcje zamiast typowych miejsc
// nadmorskiego wypoczynku. Poniższe kategorie to realne kategorie z
// oficjalnej listy Geoapify (apidocs.geoapify.com/docs/places/#categories),
// celowo ograniczone do takich, które są SPECYFICZNE dla wybrzeża — plaże,
// kurorty plażowe, wydmy, kempingi (istotne przy podróży camperem), molo i
// latarnie. Celowo NIE ma tu "leisure.park" ani "tourism.attraction.
// viewpoint" — te kategorie istnieją wszędzie (parki i punkty widokowe są
// też 80 km w głębi lądu), więc w testach ciągnęły trasę daleko od morza.
// Uwaga: "natural.beach" i "tourism.resort" nie istnieją w tej
// taksonomii — najbliższe realne odpowiedniki to "natural.coastal" i
// "beach.beach_resort", których używamy tutaj zamiast nich.
const COASTAL_RELAX_CATEGORIES = [
  "beach",
  "beach.beach_resort",
  "natural.coastal",
  "natural.sand.dune",
  "camping",
  "man_made.pier",
  "man_made.lighthouse",
  "tourism.sights.lighthouse",
];

function resolveCategories(interests: string[], regionTypes: string[] | undefined): string[] {
  // Dla Morze+Relaks kategorie ZASTĘPUJEMY, nie dokładamy — bazowy zestaw
  // dla Relaks zawiera "natural.water", które pasuje do KAŻDEGO zbiornika
  // wodnego (też śródlądowego jeziora czy stawu). W testach to właśnie ta
  // szeroka kategoria zalewała wyniki miejscami typu "Jezioro X" 50-80 km
  // w głębi lądu zamiast plaż i promenad nad samym morzem.
  if ((regionTypes ?? []).includes("Morze") && interests.includes("Relaks")) {
    return COASTAL_RELAX_CATEGORIES;
  }

  const categories = interests.flatMap(
    (interest) => INTEREST_TO_GEOAPIFY_CATEGORIES[interest] ?? [],
  );

  const unique = Array.from(new Set(categories));
  return unique.length > 0 ? unique : DEFAULT_CATEGORIES;
}

type GeoapifyPlaceFeature = {
  properties: {
    place_id: string;
    name?: string;
    formatted?: string;
    lat: number;
    lon: number;
    country_code?: string;
    // Geoapify zwraca to zawsze przy wyszukiwaniu po "categories" (pełna
    // lista WSZYSTKICH kategorii, do których dany obiekt pasuje — patrz
    // hasDisqualifyingCategory niżej). Opcjonalne w typie na wypadek, gdyby
    // pole kiedyś nie przyszło — wtedy filtr kategorii po prostu przepuszcza
    // wynik dalej (jedyną linią obrony zostaje wtedy filtr nazwy).
    categories?: string[];
  };
};

// Kategorie Geoapify, które — nawet gdy dany obiekt PRZY OKAZJI pasuje też
// do szukanej kategorii (np. "heritage"/"tourism.sights") — w praktyce
// oznaczają biznes, usługę albo jednostkę administracyjną, a nie atrakcję
// turystyczną. Realny przypadek, który ujawnił ten problem: wyszukiwanie
// zainteresowania "Historia" (kategorie: tourism.sights, heritage, ...) na
// Środkowym Wybrzeżu zwróciło jako "przystanek" trasy "Dr Med. Edward
// Bieszka" — prywatny gabinet lekarski, najpewniej w zabytkowej kamienicy
// otagowanej w OSM też jako "heritage". Podobnie "populated_place" potrafi
// zwrócić całą miejscowość/dzielnicę (np. "Wrzeszcz") jako "miejsce" zamiast
// konkretnej atrakcji w niej.
const DISQUALIFYING_CATEGORY_PREFIXES = [
  "healthcare",
  "office",
  "commercial",
  "populated_place",
  "education",
  "service",
];

function hasDisqualifyingCategory(categories: string[] | undefined): boolean {
  if (!categories) return false;
  return categories.some((category) =>
    DISQUALIFYING_CATEGORY_PREFIXES.some(
      (prefix) => category === prefix || category.startsWith(`${prefix}.`),
    ),
  );
}

// Druga, niezależna linia obrony — kategorie Geoapify/OSM bywają
// niekompletne albo błędnie przypisane, więc same nie wystarczają (patrz
// komentarz wyżej). Rozpoznaje nazwy, które same w sobie ewidentnie
// wskazują na firmę/instytucję, a nie miejsce do zwiedzania, po typowych
// polskich tytułach zawodowych i formach prawnych w nazwie.
const NON_TOURIST_NAME_PATTERN =
  /^(dr\.?|prof\.?|mgr\.?|lek\.?med\.?|ks\.?)\s|\b(sp\.\s?z\s?o\.?\s?o\.?|s\.a\.|kancelaria|gabinet|przychodni[ae]|urząd)\b/i;

export function looksLikeNonTouristPlace(
  name: string,
  categories?: string[],
): boolean {
  return hasDisqualifyingCategory(categories) || NON_TOURIST_NAME_PATTERN.test(name.trim());
}

type GeoapifyDetailsFeature = {
  properties: {
    name?: string;
    // Obecne na properties, gdy miejsce ma adres — niezależnie od typu
    // geometrii (patrz komentarz przy fetchPlaceDetails niżej).
    lat?: number;
    lon?: number;
    description?: string;
    website?: string;
    wiki_and_media?: {
      image?: string;
      wikipedia?: string;
      wikimedia_commons?: string;
    };
  };
  // Dla obszarów (jeziora, parki, budynki) geometria to Polygon/
  // MultiPolygon — zagnieżdżona tablica pierścieni, nie prosta para
  // [lon, lat]. Typujemy więc "coordinates" jako nieznane i parsujemy
  // je ostrożnie, tylko gdy typ to faktycznie "Point".
  geometry?: { type: string; coordinates: unknown };
};

export type FetchProtectedPlacesParams = {
  // Surowe kategorie Geoapify, już rozstrzygnięte przez wywołującego (patrz
  // resolveCategories tutaj, resolveFallbackCategories w accommodation.ts)
  // — ta funkcja nie zna różnicy między "zainteresowaniem" a "typem
  // noclegu", tylko rozmawia z API i chroni wynik.
  categories: string[];
  center: Coordinates;
  radiusMeters: number;
  limit: number;
  exclude: Coordinates[];
};

// Jedyne miejsce w appce, które powinno wysyłać zapytanie do Geoapify
// /v2/places — każdy fragment kodu potrzebujący uzupełnienia z zewnętrznego
// źródła (generator tras w getRoutePlaces.ts, przeglądanie kategorii w
// getCategoryPlaces.ts, propozycje noclegu w accommodation.ts) ma
// przechodzić przez to jedno miejsce, żeby żaden z nich nie mógł
// przypadkiem pominąć którejś z trzech niezależnych warstw ochrony poniżej.
// Wcześniej accommodation.ts miało własny, osobny fetch bez ŻADNEJ z nich
// (m.in. filter=circle zamiast filter=rect — dokładnie ten sam błąd, który
// filter=rect naprawił tu wcześniej dla zagranicznych punktów startowych) —
// dokładnie ten typ rozjazdu, któremu ta funkcja ma zapobiec na przyszłość.
export async function fetchProtectedPlaces({
  categories,
  center,
  radiusMeters,
  limit,
  exclude,
}: FetchProtectedPlacesParams): Promise<ExternalPlaceResult[]> {
  if (!GEOAPIFY_API_KEY) return [];

  try {
    // "filter" jest twardym ograniczeniem (wyklucza wyniki spoza obszaru),
    // a "bias" tylko preferuje wyniki bliżej podanego punktu, nie
    // wykluczając reszty — dlatego to filter=rect musi wyznaczać granicę
    // Polski, a nie promień wokół center (który bywa punktem startowym
    // użytkownika spoza kraju, np. Zurychem). Wcześniej używaliśmy tu
    // filter=circle wokół center, co przy zagranicznym punkcie startowym
    // dosłownie szukało miejsc za granicą zamiast w Polsce.
    const searchUrl =
      `${PLACES_URL}?categories=${encodeURIComponent(categories.join(","))}` +
      `&filter=rect:${POLAND_BOUNDS.minLng},${POLAND_BOUNDS.minLat},${POLAND_BOUNDS.maxLng},${POLAND_BOUNDS.maxLat}` +
      `&bias=circle:${center.lng},${center.lat},${radiusMeters}` +
      `&limit=${Math.min(limit * 3, 40)}&lang=pl&apiKey=${GEOAPIFY_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const features = (searchData.features ?? []) as GeoapifyPlaceFeature[];

    const candidates = features.filter((feature) => {
      if (!feature.properties.name) return false;
      // filter=rect (POLAND_BOUNDS) to prostokąt, nie dokładny wielokąt
      // granic — w okolicach Świnoujścia/Cieszyna itp. potrafi objąć wąski
      // skrawek sąsiedniego kraju. country_code z samych danych Geoapify
      // to prosty, darmowy dodatkowy filtr precyzyjniejszy niż prostokąt.
      if (feature.properties.country_code && feature.properties.country_code !== "pl") {
        return false;
      }
      // Odrzuca biznesy/usługi/jednostki administracyjne, które formalnie
      // pasują do szukanej kategorii, ale nie są atrakcją turystyczną —
      // patrz komentarz przy looksLikeNonTouristPlace. To właśnie ten filtr
      // usuwa z wyników np. gabinety lekarskie w zabytkowych kamienicach.
      if (
        looksLikeNonTouristPlace(feature.properties.name, feature.properties.categories)
      ) {
        return false;
      }
      const point = { lat: feature.properties.lat, lng: feature.properties.lon };
      return !exclude.some(
        (curated) => distanceKm(curated, point) < MIN_DISTANCE_FROM_CURATED_KM,
      );
    });

    const picked = candidates.slice(0, Math.min(limit, MAX_DETAIL_LOOKUPS));

    const details = await Promise.all(
      picked.map(async (feature) => {
        try {
          const detailUrl =
            `${PLACE_DETAILS_URL}?id=${feature.properties.place_id}` +
            `&features=details&lang=pl&apiKey=${GEOAPIFY_API_KEY}`;
          const detailRes = await fetch(detailUrl);
          if (!detailRes.ok) return null;
          const detailData = await detailRes.json();
          return (detailData.features?.[0] as GeoapifyDetailsFeature | undefined) ?? null;
        } catch {
          return null;
        }
      }),
    );

    return picked.map((feature, index) => {
      const detailProps = details[index]?.properties;
      const description =
        detailProps?.description?.trim() ||
        feature.properties.formatted ||
        "Dodatkowe miejsce w pobliżu trasy, znalezione poza naszą kuratorską bazą.";

      return {
        externalId: feature.properties.place_id,
        title: feature.properties.name!,
        description: description.slice(0, 220),
        lat: feature.properties.lat,
        lng: feature.properties.lon,
        image: detailProps?.wiki_and_media?.image ?? null,
        imageAlt: feature.properties.name!,
        sourceUrl:
          detailProps?.wiki_and_media?.wikipedia ?? detailProps?.website ?? null,
        categories: feature.properties.categories,
      };
    });
  } catch {
    // Sieć/Geoapify niedostępne — po prostu nie dokładamy miejsc
    // podstawowych, trasa zostaje zbudowana z samej bazy kuratorskiej.
    return [];
  }
}

async function fetchPlaces({
  center,
  radiusMeters,
  interests,
  limit,
  exclude,
  regionTypes,
}: PlacesProviderParams): Promise<ExternalPlaceResult[]> {
  const categories = resolveCategories(interests, regionTypes);
  return fetchProtectedPlaces({ categories, center, radiusMeters, limit, exclude });
}

// Dociąga na żywo szczegóły jednego miejsca po jego Geoapify place_id.
// Miejsca "podstawowe" nie mają własnego rekordu w Supabase (ich dane
// nigdy nie są zapisywane — powstają tylko na czas generowania trasy),
// więc strona szczegółów odpytuje o nie ponownie w tym miejscu.
async function fetchPlaceDetails(externalId: string): Promise<ExternalPlaceResult | null> {
  if (!GEOAPIFY_API_KEY) return null;

  try {
    const detailUrl =
      `${PLACE_DETAILS_URL}?id=${externalId}` +
      `&features=details&lang=pl&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await fetch(detailUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0] as GeoapifyDetailsFeature | undefined;
    if (!feature?.properties.name) return null;

    // Preferujemy properties.lat/lon — Geoapify je podaje jako proste
    // liczby niezależnie od typu geometrii. Do współrzędnych z geometrii
    // sięgamy tylko jako zapasowo, i tylko dla punktów — dla jezior,
    // parków czy budynków geometria to Polygon/MultiPolygon (zagnieżdżona
    // tablica pierścieni), a nie pojedyncza para [lon, lat].
    let lat = feature.properties.lat;
    let lng = feature.properties.lon;

    if ((lat === undefined || lng === undefined) && feature.geometry?.type === "Point") {
      const point = feature.geometry.coordinates as [number, number];
      [lng, lat] = point;
    }

    if (lat === undefined || lng === undefined) return null;

    const description =
      feature.properties.description?.trim() ||
      "Dodatkowe miejsce, znalezione poza naszą kuratorską bazą.";

    return {
      externalId,
      title: feature.properties.name,
      description: description.slice(0, 600),
      lat,
      lng,
      image: feature.properties.wiki_and_media?.image ?? null,
      imageAlt: feature.properties.name,
      sourceUrl:
        feature.properties.wiki_and_media?.wikipedia ?? feature.properties.website ?? null,
    };
  } catch {
    return null;
  }
}

export const geoapifyProvider: PlacesProvider = {
  id: "geoapify",
  attribution: {
    author: "Geoapify (dane OpenStreetMap)",
    license: "ODbL",
  },
  fetchPlaces,
  fetchPlaceDetails,
};
