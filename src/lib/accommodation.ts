import type { Nocleg, NoclegTyp, PoziomKomfortu } from "@/data/noclegi";
import type { Coordinates, RouteDay } from "@/lib/generateRoute";
import { distanceKm } from "@/lib/geo";
import { isWithinSupportedRegions } from "@/lib/poland";
import {
  fetchProtectedPlaces,
  type FetchProtectedPlacesParams,
  type ExternalPlaceResult,
} from "@/lib/placesProviders";

// Wybór w formularzu planera — "hotel_pensjonat" łączy dwa typy z tabeli
// noclegi (hotel/pensjonat), bo dla użytkownika to jedna, wspólna
// kategoria ("nocleg pod dachem"), nie dwie osobne.
export const ACCOMMODATION_TYPE_OPTIONS = [
  { value: "kemping", label: "Kemping" },
  { value: "pole namiotowe", label: "Pole namiotowe" },
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
    // Zgłoszenie 06.09: prawdziwe, komercyjne obiekty (np. Fly Resort) mają
    // tu link do własnej oferty/rezerwacji — nasze wcześniejsze wpisy bez
    // takiej strony mają Nocleg.link = null, więc zachowują się jak dotąd.
    sourceUrl: nocleg.link,
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
  const withinRadius = noclegi
    .filter((n) => distanceKm(point, n) <= MAX_DISTANCE_KM)
    .filter((n) => !looksLikeMembersOnlyAccommodation(n.nazwa));
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

// Kategorie Geoapify dla noclegów (camping.*/accommodation) nie
// rozróżniają "otwarte dla każdego" od "prywatne, tylko dla członków
// organizacji" — obóz harcerski (ZHP) formalnie mieści się w kategorii
// "camping", ale nie da się tam po prostu przyjechać jako przypadkowy
// turysta (zgłoszenie 04.09: appka zaproponowała "Obóz ZHP" jako nocleg
// dla ogólnej podróży camperem). Ten sam wzorzec co looksLikeNonTouristPlace
// w geoapify.ts — niezależna, tekstowa druga linia obrony, tu swoista dla
// noclegów. Nie ma odpowiednika w fetchProtectedPlaces, bo to filtr
// znający semantykę NASZEGO pojęcia "nocleg dostępny dla turysty", nie
// ogólną kategorię "atrakcja"/"biznes".
const MEMBERS_ONLY_ACCOMMODATION_NAME_PATTERN = /\bzhp\b|harcer|obóz\s+(szkoleniowy|zamkni[eę]ty)/i;

export function looksLikeMembersOnlyAccommodation(nazwa: string): boolean {
  return MEMBERS_ONLY_ACCOMMODATION_NAME_PATTERN.test(nazwa.trim());
}

function guessTypeFromCategories(categories: string[] | undefined): NoclegTyp | "nocleg" {
  const cats = categories ?? [];
  if (cats.some((c) => c.startsWith("camping"))) return "kemping";
  if (cats.some((c) => c.includes("hotel"))) return "hotel";
  if (cats.some((c) => c.includes("guest_house"))) return "pensjonat";
  return "nocleg";
}

// Typ funkcji dociągającej z zewnętrznego dostawcy — domyślnie prawdziwe
// fetchProtectedPlaces (geoapify.ts), ale wstrzykiwalny w testach (patrz
// accommodation.test.ts), tym samym wzorcem co provider w
// resolveRoutePlaces/resolveCategoryPlaces.
type FetchPlaces = (params: FetchProtectedPlacesParams) => Promise<ExternalPlaceResult[]>;

// Dociąga jedną propozycję noclegu z Geoapify, gdy w promieniu nie ma
// żadnej pasującej pozycji w naszej bazie (patrz punkt 3 zgłoszenia).
// Zwraca "podstawową" (source: "basic") propozycję, zgodnie z tą samą
// konwencją co miejsca z src/lib/getRoutePlaces.ts.
//
// Reużywa fetchProtectedPlaces zamiast własnego, osobnego zapytania do
// Geoapify — wcześniej ten fallback miał tu własny fetch z filter=circle
// (bez twardego ograniczenia do granic Polski), bez sprawdzenia
// country_code i bez looksLikeNonTouristPlace, więc dokładnie ten sam typ
// błędu, który naprawiono dla tras 18.08 (np. gabinet lekarski zamiast
// atrakcji), mógł wrócić tu jako proponowany nocleg.
// Zgłoszenie 06.09 (Poziom 2.5 ścieżki "Baza wypadowa"): wydzielone z
// dawnej fetchAccommodationFallback (dziś cienki wrapper na tę funkcję z
// limit=1), żeby Poziom 2.5 mógł pokazać KILKA propozycji z Geoapify do
// wyboru, nie tylko jedną najlepszą — bez duplikowania całego zapytania i
// filtrowania.
async function fetchAccommodationFallbackOptions(
  point: Coordinates,
  options: AccommodationMatchOptions,
  fetchPlaces: FetchPlaces,
  limit: number,
): Promise<AccommodationOption[]> {
  const categories = resolveFallbackCategories(options.accommodationType, options.transport);

  const results = await fetchPlaces({
    categories,
    center: point,
    radiusMeters: MAX_DISTANCE_KM * 1000,
    limit: Math.max(limit * 3, 5),
    exclude: [],
  });

  // Twardy strażnik — patrz isWithinSupportedRegions w poland.ts. Punkt,
  // dla którego szukamy noclegu, to zawsze przystanek już wygenerowanej
  // trasy (więc sam z zasady leży w jednym z dwóch wspieranych regionów),
  // ale sam wynik — nawet w promieniu MAX_DISTANCE_KM od niego — może już
  // wypaść poza granicę, blisko jej krawędzi. fetchProtectedPlaces chroni
  // przed nieturystycznymi/zagranicznymi wynikami, ale nie zna pojęcia
  // "region wspierany przez tę appkę" — to sprawdzamy dopiero tutaj.
  const withinSupportedRegions = results
    .filter((r) => isWithinSupportedRegions({ lat: r.lat, lng: r.lng }))
    .filter((r) => !looksLikeMembersOnlyAccommodation(r.title));

  // fetchProtectedPlaces zwraca wyniki w kolejności preferowanej przez
  // "bias" Geoapify (najbliższe najpierw) — zostaje więc zachowana.
  return withinSupportedRegions.slice(0, limit).map((result) => ({
    id: `geoapify-${result.externalId}`,
    nazwa: result.title,
    typ: guessTypeFromCategories(result.categories),
    lat: result.lat,
    lng: result.lng,
    distanceKm: distanceKm(point, result),
    udogodnienia: null,
    poziomKomfortu: null,
    source: "basic",
    sourceUrl: result.sourceUrl,
  }));
}

async function fetchAccommodationFallback(
  point: Coordinates,
  options: AccommodationMatchOptions,
  fetchPlaces: FetchPlaces,
): Promise<AccommodationOption | null> {
  const [best] = await fetchAccommodationFallbackOptions(point, options, fetchPlaces, 1);
  return best ?? null;
}

// Zgłoszenie 06.09 (Poziom 2.5 ścieżki "Baza wypadowa"): w odróżnieniu od
// pickCuratedAccommodation (dopasowanie po ODLEGŁOŚCI od dowolnego punktu
// trasy objazdowej — słuszne tam, bo przystanek trasy nie ma z góry
// żadnego "swojego" noclegu) tu dopasowanie jest po PRZYNALEŻNOŚCI
// REDAKCYJNEJ (Nocleg.miejscePowiazane) — Poziom 2.5 ma pokazać KONKRETNE,
// kuratorskie obiekty PRZYPISANE do tej miejscowości, nie "cokolwiek w
// promieniu 20 km", co przy gęściej rozmieszczonych miejscowościach
// mogłoby przypadkiem pokazać kemping z sąsiedniej miejscowości.
function curatedAccommodationForPlace(placeSlug: string, noclegi: Nocleg[]): Nocleg[] {
  return noclegi.filter((n) => n.miejscePowiazane === placeSlug);
}

// Sam zamek/pałac, który (patrz functionsAsHotel w suggestBases.ts)
// faktycznie prowadzi dziś hotel — reprezentuje SAM SIEBIE jako opcję
// noclegu na Poziomie 2.5, bez potrzeby osobnego wiersza w tabeli
// `noclegi`. `id` z prefiksem "self-" (analogicznie do "geoapify-" dla
// wyników z Geoapify) — używane jako wartość parametru `obiekt` w URL.
function placeAsAccommodationOption(place: {
  slug: string;
  title: string;
  lat: number;
  lng: number;
}): AccommodationOption {
  return {
    id: `self-${place.slug}`,
    nazwa: place.title,
    typ: "hotel",
    lat: place.lat,
    lng: place.lng,
    distanceKm: 0,
    udogodnienia: null,
    poziomKomfortu: null,
    source: "curated",
    sourceUrl: null,
  };
}

// Zgłoszenie 06.09, wymogi 1-2 (Poziom 2.5): lista KONKRETNYCH obiektów
// noclegowych do wyboru dla jednej miejscowości/bazy — w kolejności:
// (1) sama baza, jeśli to zamek/pałac z potwierdzoną funkcją hotelową,
// (2) kuratorskie noclegi z tabeli `noclegi` przypisane do tej miejscowości,
// (3) TYLKO gdy (1)+(2) razem nic nie dały — do 5 propozycji z Geoapify
// (kategorie camping/accommodation/hotel), oznaczonych jak zawsze
// source: "basic" ("Odkryj więcej" w UI, patrz BaseRadiusExplorer.tsx).
// Nigdy nie miesza kuratorskich i "basic" naraz — ten sam wzorzec co
// getAccommodationOptions niżej (kuratorskie mają pierwszeństwo w całości,
// Geoapify tylko jako uzupełnienie prawdziwej luki w danych).
export async function getAccommodationOptionsForBase(
  base: { slug: string; title: string; lat: number; lng: number },
  noclegi: Nocleg[],
  options: AccommodationMatchOptions,
  baseFunctionsAsHotel: boolean,
  fetchPlaces: FetchPlaces = fetchProtectedPlaces,
): Promise<AccommodationOption[]> {
  const curated = curatedAccommodationForPlace(base.slug, noclegi).map((n) => toOption(n, base));
  const self = baseFunctionsAsHotel ? [placeAsAccommodationOption(base)] : [];
  const combined = [...self, ...curated];

  if (combined.length > 0) return combined;

  return fetchAccommodationFallbackOptions(base, options, fetchPlaces, 5);
}

// Zwraca propozycje noclegu dla jednego punktu (ostatniego przystanku
// dnia): najpierw z naszej bazy, a jeśli w promieniu nie ma żadnej,
// dociąga jedną z Geoapify.
export async function getAccommodationOptions(
  point: Coordinates,
  noclegi: Nocleg[],
  options: AccommodationMatchOptions,
  fetchPlaces: FetchPlaces = fetchProtectedPlaces,
): Promise<AccommodationOption[]> {
  const curated = pickCuratedAccommodation(point, noclegi, options, 3);
  if (curated.length > 0) return curated;

  const fallback = await fetchAccommodationFallback(point, options, fetchPlaces);
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
  fetchPlaces: FetchPlaces = fetchProtectedPlaces,
): Promise<RouteDayWithAccommodation[]> {
  return Promise.all(
    days.map(async (day) => {
      const lastStop = day.places[day.places.length - 1];
      if (!lastStop) return { ...day, accommodationOptions: [] };

      const accommodationOptions = await getAccommodationOptions(
        { lat: lastStop.lat, lng: lastStop.lng },
        noclegi,
        options,
        fetchPlaces,
      );
      return { ...day, accommodationOptions };
    }),
  );
}
