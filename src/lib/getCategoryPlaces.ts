import type { Place } from "@/data/places";
import {
  activePlacesProvider,
  type ExternalPlaceResult,
  type PlacesProvider,
} from "@/lib/placesProviders";
import { dedupeByExternalId } from "@/lib/placesProviders/dedupe";
import { isWithinBounds, SUPPORTED_BROWSE_REGIONS } from "@/lib/poland";

// Poniżej tej liczby kuratorskich miejsc w danej kategorii widok "Wszystkie
// miejsca — <kategoria>" wyglądałby na ubogi — dociągamy wtedy uzupełnienie
// z aktywnego dostawcy zewnętrznego. Wyższy próg niż MIN_MATCHING_CURATED_PLACES
// w getRoutePlaces.ts (4): tam liczy się pula do wyboru kilku przystanków
// trasy, tu użytkownik widzi od razu całą siatkę kart naraz.
export const MIN_CATEGORY_RESULTS = 6;

// 55 km (pierwotna wartość) zostawiało "dziury" między kotwicami Wielkopolski
// — najdalszy róg WIELKOPOLSKA_BOUNDS (okolice południowo-zachodnie) leży aż
// ~79 km od najbliższej z 3 kotwic (Poznań/Gniezno/Kalisz-Zawodzie), więc dla
// rzadszych kategorii (np. "Zamki i Pałace", "Parki Narodowe") żadna z 13
// kotwic w ogóle nie znajdowała wyniku, mimo że w obszarze Wielkopolski/
// wybrzeża takie miejsca realnie istnieją (zweryfikowane bezpośrednim
// zapytaniem do Geoapify). 85 km z zapasem pokrywa cały prostokąt
// WIELKOPOLSKA_BOUNDS bez dziur. To bezpieczne zwiększenie — promień to
// tylko "bias" (miękka preferencja), o właściwym obszarze i tak decyduje
// niezależny, twardy filtr isWithinBounds niżej, więc szerszy promień nie
// przepuszcza wyników spoza Wielkopolski/wybrzeża, tylko zwiększa szansę na
// znalezienie czegokolwiek w ich obrębie.
const CATEGORY_SEARCH_RADIUS_METERS = 85_000;
const CATEGORY_SEARCH_LIMIT = 12;

function toBasicCategoryPlace(result: ExternalPlaceResult, tag: string): Place {
  return {
    slug: `${activePlacesProvider.id}-${result.externalId}`,
    title: result.title,
    // Miejsca "podstawowe" tutaj nie są przypisane do konkretnego
    // podregionu (w przeciwieństwie do toBasicPlace w getRoutePlaces.ts) —
    // ten widok nie ma pojęcia wariantów trasy, więc nie ma po co je
    // rozróżniać.
    region: "",
    description: result.description,
    longDescription: result.description,
    lat: result.lat,
    lng: result.lng,
    image: result.image ?? "",
    imageAlt: result.imageAlt,
    credit: activePlacesProvider.attribution,
    sortOrder: 999,
    tags: [tag],
    source: "basic",
    sourceUrl: result.sourceUrl,
    regionType: [],
    surroundings: [],
    nearbyAttraction: null,
    recommendedCampsites: [],
    culinaryTip: null,
    featured: false,
  };
}

// Rdzeń logiki, oddzielony od realnych zapytań sieciowych (Supabase,
// Geoapify) — testowalny bez sieci przez wstrzyknięcie gotowej listy
// `curated` i dostawcy `provider` (patrz getCategoryPlaces.test.ts), tak
// samo jak generateRouteVariants w generateRoute.ts jest testowalne dzięki
// przyjmowaniu gotowej tablicy miejsc zamiast pobierania jej samodzielnie.
export async function resolveCategoryPlaces(
  curated: Place[],
  tag: string,
  provider: Pick<PlacesProvider, "fetchPlaces">,
): Promise<Place[]> {
  const matching = curated.filter((p) => p.tags.includes(tag));
  if (matching.length >= MIN_CATEGORY_RESULTS) {
    return matching;
  }

  const exclude = curated.map((p) => ({ lat: p.lat, lng: p.lng }));

  const perAnchor = await Promise.all(
    SUPPORTED_BROWSE_REGIONS.flatMap((region) =>
      region.anchors.map(async (anchor) => {
        const results = await provider.fetchPlaces({
          center: anchor,
          radiusMeters: CATEGORY_SEARCH_RADIUS_METERS,
          interests: [tag],
          limit: CATEGORY_SEARCH_LIMIT,
          exclude,
        });
        // "bias" Geoapify tylko PREFERUJE wyniki blisko kotwicy, nie
        // wyklucza reszty (patrz analogiczny komentarz w getRoutePlaces.ts)
        // — wynik znaleziony w promieniu kotwicy wspieranego regionu wciąż
        // może geograficznie leżeć POZA obszarem, który appka dziś realnie
        // obsługuje. isWithinBounds to niezależna, twarda granica TEGO
        // KONKRETNEGO regionu, sprawdzana PO wyszukiwaniu — ten sam wzorzec
        // co enforceSubRegionBounds w generateRoute.ts, tu zastosowany
        // przed dodaniem wyniku do puli (nie ma tu trasy do naprawiania po
        // fakcie, więc nie ma czego "zastępować" — po prostu odrzucamy).
        return results.filter((r) =>
          isWithinBounds({ lat: r.lat, lng: r.lng }, region.bounds),
        );
      }),
    ),
  );

  const deduped = dedupeByExternalId(perAnchor.flat());

  return [...matching, ...deduped.map((r) => toBasicCategoryPlace(r, tag))];
}

// Wersja "na produkcję" — pobiera bazę kuratorską z Supabase i, w razie
// potrzeby, uzupełnienie z aktywnego dostawcy zewnętrznego (patrz
// activePlacesProvider w placesProviders/index.ts — dziś Geoapify, ten sam
// serwis co w getRoutePlaces.ts dla generatora tras, więc wyniki
// automatycznie przechodzą przez tę samą walidację kategorii/nazwy, patrz
// looksLikeNonTouristPlace w placesProviders/geoapify.ts).
//
// Import ./getPlaces jest tu celowo dynamiczny, a nie na górze pliku:
// getPlaces.ts tworzy klienta Supabase jako efekt uboczny na poziomie
// modułu (patrz supabaseClient.ts), co bez zmiennych środowiskowych rzuca
// błąd już przy samym imporcie — statyczny import na górze uniemożliwiałby
// testowanie resolveCategoryPlaces (rdzenia logiki, bez sieci) bez
// konfigurowania Supabase w środowisku testowym.
export async function getCategoryPlaces(tag: string): Promise<Place[]> {
  const { getPlaces } = await import("@/lib/getPlaces");
  const curated = await getPlaces();
  return resolveCategoryPlaces(curated, tag, activePlacesProvider);
}
