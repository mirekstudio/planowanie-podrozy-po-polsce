import type { Place } from "@/data/places";
import type { Nocleg } from "@/data/noclegi";
import { filterCandidates, type RouteOptions } from "@/lib/generateRoute";
import { centroid, distanceKm } from "@/lib/geo";
import { isWithinBounds, type Bounds } from "@/lib/poland";
import { getPlaceMapIcon } from "@/lib/placeMapIcon";

// Logika dla stylu podróży "Baza wypadowa" — CELOWO osobna od
// generateRoute.ts/generateRouteVariants.ts. Tamten algorytm (najbliższy
// sąsiad, podział na dni, warianty geograficzne) zakłada podróż objazdową
// odwiedzającą kolejne różne miejsca — dla bazy wypadowej pytanie jest
// inne ("gdzie zamieszkać, żeby mieć dużo w zasięgu", nie "w jakiej
// kolejności zwiedzać"), więc nie ma potrzeby, żeby te dwie ścieżki
// współdzieliły algorytm sortowania/podziału na dni. Korzysta tylko z
// filterCandidates (ten sam filtr zainteresowań/regionu co reszta appki)
// i zwykłej odległości — nigdy z orderByProximity/generateRoute.

export type BaseCandidate = {
  slug: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  image: string;
  imageAlt: string;
  imagePosition?: "center" | "top";
  source: "curated" | "basic";
  // Placeholder graficzny dopasowany do kategorii — patrz Place.basicPlaceIcon.
  basicPlaceIcon?: string;
  // Zgłoszenie 05.09 (mapy z ikonami kategorii): ikona do pokazania na
  // PINEZCE mapy (nie na karcie) — patrz getPlaceMapIcon. W przeciwieństwie
  // do basicPlaceIcon (tylko dla "basic", bo curated i tak ma zdjęcie na
  // karcie) ta ikona jest liczona dla KAŻDEGO kandydata, curated i basic,
  // bo mapa nigdy nie pokazuje zdjęcia — tylko pinezkę.
  mapIcon: string;
  nearbyCount: number;
  radiusKm: number;
};

// Promień "w zasięgu bazy" — dojazd autem w jedną stronę bez poświęcania
// całego dnia na sam przejazd (spójne z MAX_DISTANCE_KM dla noclegów w
// accommodation.ts, tam z tego samego powodu).
export const BASE_SEARCH_RADIUS_KM = 30;

// Dwie proponowane bazy nie mogą leżeć praktycznie w tym samym miejscu
// (np. dwie plaże w tej samej miejscowości) — to nie są dwie różne
// sensowne propozycje, tylko duplikat. Stosowany TYLKO do miejsc "basic"
// (Geoapify) — patrz komentarz przy suggestBaseCandidates niżej: dane z
// Geoapify nie przechodzą redakcyjnej weryfikacji i realnie potrafią się
// dublować (cała historia filtrów w geoapify.ts), więc tu ta ochrona
// nadal ma sens.
const MIN_DISTANCE_BETWEEN_BASES_KM = 40;

const MAX_BASE_CANDIDATES = 4;
const MIN_BASE_CANDIDATES_BEFORE_FALLBACK = 2;

// Promień domyślny i zakres suwaka na tymczasowym widoku szczegółów bazy
// (/planer/baza) — patrz BaseRadiusExplorer.tsx. Osobne od
// BASE_SEARCH_RADIUS_KM (który steruje TYLKO doborem/oceną kandydatów na
// listach wyżej) — tu chodzi o to, ile użytkownik faktycznie chce
// przejechać z konkretnej, już wybranej bazy, i to on o tym decyduje.
export const DETAIL_MIN_RADIUS_KM = 5;
export const DETAIL_MAX_RADIUS_KM = 50;
export const DETAIL_DEFAULT_RADIUS_KM = 15;

function nearbyMatches(pool: Place[], center: Place, radiusKm: number): Place[] {
  return pool.filter(
    (other) => other.slug !== center.slug && distanceKm(center, other) <= radiusKm,
  );
}

// Zgłoszenie 05.09: "Słowiński Park Narodowy" pojawiał się jako propozycja
// BAZY wypadowej — błąd koncepcyjny. Park narodowy/rezerwat to obszar
// chroniony bez infrastruktury noclegowej, ATRAKCJA do której się jedzie,
// nie miejscowość, z której się wyrusza. Dwa niezależne sygnały (ten sam
// wzorzec co looksLikeNonTouristPlace/looksLikeGenericBeachAccessPoint w
// geoapify.ts): tag "Parki Narodowe" — precyzyjny dla naszych dwóch
// kuratorskich parków (sprawdzone wprost w bazie: Słowiński i
// Wielkopolski, żadnych innych) — oraz nazwa, na wypadek gdyby podobny
// obszar trafił się kiedyś z Geoapify (dane "basic" nie niosą naszych
// tagów, patrz toBasicPlace w getRoutePlaces.ts). Wyklucza z bycia
// KANDYDATEM na bazę, ale NIE z puli używanej do liczenia gęstości
// (`pool` niżej) — park narodowy w pobliżu nadal powinien podnosić
// atrakcyjność INNEJ, prawdziwej miejscowości jako bazy, i nadal pojawia
// się jako atrakcja w promieniu wybranej bazy (patrz nearbyPlacesWithDistance).
const PROTECTED_AREA_NAME_PATTERN = /park narodowy|rezerwat przyrody|obszar chroniony/i;

function isProtectedArea(place: Place): boolean {
  return place.tags.includes("Parki Narodowe") || PROTECTED_AREA_NAME_PATTERN.test(place.title);
}

// Zgłoszenie 06.09 (Poziomy 2/2.5 ścieżki "Baza wypadowa"): zamek/pałac/
// dwór to, tak jak park narodowy, ATRAKCJA do której się jedzie, nie
// miejscowość z realnym noclegiem — CHYBA że dany obiekt faktycznie
// prowadzi dziś hotel (patrz functionsAsHotel niżej). Dopasowanie PO
// NAZWIE (nie po tagu "Zamki i Pałace"!) — ten tag mają też prawdziwe,
// wielomiejscowościowe bazy typu "Kórnik i Rogalin" (bo ich OPIS dotyczy
// m.in. zamku), a te mają zostać pełnoprawnymi kandydatami. Wzorzec łapie
// więc tylko rekordy, których TYTUŁ dosłownie zaczyna się od nazwy typu
// budowli — sprawdzone bezpośrednio w całej bazie (06.09): dokładnie 8
// takich rekordów, żaden fałszywie nie łapie żadnej realnej miejscowości.
const CASTLE_PALACE_NAME_PATTERN = /^(zamek|pałac|dwór)\b/i;

function isCastleOrPalace(place: Place): boolean {
  return CASTLE_PALACE_NAME_PATTERN.test(place.title.trim());
}

// "dziś hotel" to redakcyjna fraza w krótkim polu `description`, używana
// WYŁĄCZNIE gdy źródłowy przewodnik wprost potwierdza działającą funkcję
// hotelową budynku — sprawdzone bezpośrednio w całej bazie (06.09):
// dokładnie 2 rekordy mają w ogóle słowo "hotel" w opisie ("Zamek w
// Rydzynie", "Pałac w Wąsowie"), oba dokładnie tą frazą. Nigdy nie
// zgadywane z samego faktu, że budynek jest duży/zabytkowy — bez tej
// frazy appka zakłada, że to zwykła atrakcja turystyczna, nie nocleg.
// Eksportowana — Poziom 2.5 (nowa strona /planer/baza-obiekt) używa jej
// wprost, żeby wiedzieć, czy dołożyć samą bazę jako własną opcję noclegu.
// Przyjmuje samo `description` (nie cały Place) — Poziom 2.5 dostaje tam
// gotowego BaseCandidate, nie pełny Place, a funkcji naprawdę potrzeba
// tylko tego jednego pola.
const ACTIVE_HOTEL_DESCRIPTION_PATTERN = /dziś hotel/i;

export function functionsAsHotel(place: { description: string }): boolean {
  return ACTIVE_HOTEL_DESCRIPTION_PATTERN.test(place.description);
}

// Jedyne miejsce, gdzie te dwie reguły faktycznie WYKLUCZAJĄ z bycia
// kandydatem na bazę (Poziom 2) — dokładnie ten sam wzorzec co
// isProtectedArea: `pool` użyty do liczenia gęstości (nearbyCount) zostaje
// pełny, więc wykluczony zamek/pałac nadal podnosi atrakcyjność sąsiedniej,
// prawdziwej miejscowości jako jedna z jej atrakcji w zasięgu.
function isIneligibleAsBaseCandidate(place: Place): boolean {
  if (isProtectedArea(place)) return true;
  if (isCastleOrPalace(place)) return !functionsAsHotel(place);
  return false;
}

// Zgłoszenie 06.09: "kryteria jakości bazy wypadowej", wspólne dla
// WSZYSTKICH regionów appki, obecnych i przyszłych — bez ręcznego
// dostrajania per region. `isIneligibleAsBaseCandidate` wyżej zostaje
// jedynym TWARDYM wykluczeniem (obszar chroniony lub zabytek bez
// działającego hotelu na pewno nie ma infrastruktury noclegowej — to
// jedyny sygnał, co do którego appka może być w 100% pewna, niezależnie
// od regionu). Cztery kryteria niżej działają jako WAGI dodawane do
// nearbyCount (gęstość, wymóg 3 — zostaje bez zmian jako dominujący
// składnik wyniku), nie jako kolejne twarde filtry —
// uzasadnienie przy LODGING_BONUS niżej, bo to tam ta decyzja waży
// najwięcej.

// --- Kryterium 1: realna infrastruktura noclegowa -------------------------
//
// Dwa NIEZALEŻNE, pozytywne sygnały (branie TYLKO nieobecności "to obszar
// chroniony" za dowód "ma nocleg" byłoby, jak słusznie zauważono w
// zgłoszeniu, za słabym testem):
//   (a) redakcyjne pole Place.recommendedCampsites — wypełnione ręcznie
//       dla części kuratorskich miejsc (patrz opisy_z_dusza... i wcześniejsza
//       runda kuracji 06.09), samo w sobie już potwierdza nocleg "z pierwszej
//       ręki";
//   (b) tabela `noclegi` (osobna, ustrukturyzowana baza z własnymi
//       współrzędnymi, patrz src/data/noclegi.ts) — sprawdzana PO
//       WSPÓŁRZĘDNYCH kandydata, NIE po polu miejscePowiazane (to pole jest
//       tylko redakcyjną notatką, nie autorytatywnym kluczem — działa więc
//       tak samo dla kandydatów "basic"/Geoapify, które nigdy nie mają
//       miejscePowiazane, jak i dla kuratorskich).
//
// DLACZEGO waga, nie twardy filtr: tabela `noclegi` ma dziś tylko 14
// rekordów, a `recommendedCampsites` jest uzupełnione tylko dla części
// kuratorskich miejsc — oba źródła są niekompletne, nie negatywne. Gdyby
// brak potwierdzonego noclegu WYKLUCZAŁ kandydata, appka przestałaby
// proponować Trójmiasto, Ustkę, Darłowo czy większość Wielkopolski
// (Giecz, Kalisz, Strzelno, Kórnik i Rogalin...) — miejsca, które
// oczywiście MAJĄ noclegi w rzeczywistości, po prostu appka nie ma tego
// jeszcze w żadnej z tych dwóch baz. Twardy filtr ukarałby więc brak
// DANYCH, nie brak noclegów — i to samo dotyczyłoby KAŻDEGO przyszłego
// regionu, dopóki ktoś ręcznie nie uzupełni dla niego obu tabel (dokładne
// przeciwieństwo wymogu "bez ręcznego dostrajania per region"). Waga
// realnie premiuje potwierdzoną infrastrukturę tam, gdzie dane już są,
// bez psucia regionów, gdzie danych jeszcze brak.
const LODGING_SEARCH_RADIUS_KM = 20; // ten sam promień i to samo uzasadnienie co MAX_DISTANCE_KM w accommodation.ts — celowo duplikowane, nie importowane (patrz nota o niezależności tego pliku na górze)
const LODGING_BONUS = 1.5;

function hasConfirmedLodging(place: Place, noclegi: Nocleg[]): boolean {
  if (place.recommendedCampsites.length > 0) return true;
  return noclegi.some((n) => distanceKm(place, n) <= LODGING_SEARCH_RADIUS_KM);
}

// --- Kryterium 2: centralne położenie względem atrakcji regionu -----------
//
// Środek ciężkości (centroid, patrz geo.ts) liczony z CAŁEJ puli pasujących
// atrakcji (`pool` — ten sam zbiór, którego już używa nearbyCount), nie z
// samych kandydatów na bazę — chodzi o to, gdzie FAKTYCZNIE są atrakcje w
// regionie, nie gdzie są potencjalne noclegi. Odległość każdego kandydata
// od tego centroidu jest potem znormalizowana WZGLĘDEM innych kandydatów w
// TYM SAMYM wywołaniu (dzielona przez największą taką odległość wśród
// nich) — dzięki temu "centralność" jest zawsze relatywna do skali
// bieżącego regionu (mały klaster Wielkopolski vs. rozciągnięte na setki
// km wybrzeże) i nie wymaga żadnego stałego progu w kilometrach, który
// trzeba by osobno dobierać dla każdego regionu.
const CENTRALITY_MAX_BONUS = 1;

function centralityBonusFor(
  place: Place,
  poolCentroid: { lat: number; lng: number } | null,
  maxCentroidDistanceKm: number,
): number {
  if (!poolCentroid || maxCentroidDistanceKm <= 0) return 0;
  const distance = distanceKm(place, poolCentroid);
  return CENTRALITY_MAX_BONUS * (1 - distance / maxCentroidDistanceKm);
}

// --- Kryterium 4: różnorodność kategorii atrakcji w zasięgu ----------------
//
// Liczy tagi WYŁĄCZNIE wśród atrakcji faktycznie leżących w promieniu
// BASE_SEARCH_RADIUS_KM od danego kandydata (ten sam zbiór, z którego
// liczy się nearbyCount) — miejsce z 5 plażami w zasięgu (1 unikalny tag)
// wypada gorzej na tym kryterium niż miejsce z historią + naturą +
// aktywnością fizyczną (3 unikalne tagi), nawet przy tej samej liczbie
// atrakcji. Mianownik (liczba unikalnych tagów w CAŁEJ puli, nie sztywna
// lista kategorii appki) sam dopasowuje się do słownika tagów danego
// regionu/zestawu zainteresowań — region, w którym w ogóle występują tylko
// 2 różne tagi, nie jest z góry skazany na niski wynik różnorodności tylko
// dlatego, że appka globalnie zna ich więcej.
const DIVERSITY_MAX_BONUS = 1;

function distinctTags(places: Place[]): Set<string> {
  const tags = new Set<string>();
  for (const place of places) {
    for (const tag of place.tags) tags.add(tag);
  }
  return tags;
}

function diversityBonusFor(nearby: Place[], totalDistinctTagsInPool: number): number {
  if (totalDistinctTagsInPool === 0) return 0;
  return DIVERSITY_MAX_BONUS * (distinctTags(nearby).size / totalDistinctTagsInPool);
}

// --- Kryterium 5: wielkość/charakter miejscowości (najmniej istotne) ------
//
// Zgłoszenie 06.09 wprost każe to potraktować jako "opcjonalne, jeśli dane
// są niepewne". Sprawdziłem: appka DZIŚ nigdzie nie pobiera ani nie
// przechowuje population/typu miejscowości — ani Place, ani
// ExternalPlaceResult z Geoapify (geoapify.ts) nie niosą takiego pola.
// Geoapify SAM w sobie potrafi zwracać dane administracyjne
// (`populated_place`), ale appka je dziś świadomie ODRZUCA jako fałszywe
// atrakcje (patrz DISQUALIFYING_CATEGORY_PREFIXES w geoapify.ts) — dociąg
// tej informacji naprawdę wymagałby OSOBNEGO zapytania geokodującego per
// kandydat (nowy, síeciowy koszt na kandydata, którego dziś ta w pełni
// synchroniczna funkcja nie ma). Zamiast zgadywać zastępczy sygnał (np.
// mylić "dużo atrakcji" z "duża miejscowość" — to dwie różne rzeczy),
// funkcja niżej to udokumentowany, NIEAKTYWNY dziś hak: zawsze zwraca 0,
// gotowy do wypełnienia prawdziwym sygnałem, gdy appka faktycznie zacznie
// gdzieś przechowywać dane o wielkości miejscowości. Docelowy sufit wagi,
// gdy ten hak kiedyś zostanie wypełniony: ok. 0.3 — wyraźnie mniejszy niż
// pozostałe trzy wagi, zgodnie z wymogiem "najmniej istotne kryterium".
// Parametr zostaje w sygnaturze celowo: przyszła implementacja będzie
// potrzebować współrzędnych/kategorii tego miejsca, żeby dociągnąć/ocenić
// jego wielkość.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function settlementSizeBonusFor(place: Place): number {
  return 0;
}

export type BaseQualityScore = {
  nearbyCount: number;
  hasLodging: boolean;
  centralityBonus: number;
  diversityBonus: number;
  settlementSizeBonus: number;
  total: number;
};

// Łączy wszystkie kryteria w jeden wynik do sortowania. nearbyCount
// (wymóg 3) zostaje DOMINUJĄCYM składnikiem — w typowych dla appki
// zakresach (0-10 atrakcji w promieniu) żadna kombinacja pozostałych wag
// (maks. 1.5 + 1 + 1 + 0.3 = 3.8) nie odwróci przewagi kandydata z
// wyraźnie większą liczbą atrakcji w zasięgu; te wagi rozstrzygają przede
// wszystkim REMISY i BLISKIE przypadki (np. dwa miejsca z tą samą liczbą
// atrakcji, z których jedno leży centralnie i ma noclegi, a drugie na
// skraju regionu z samymi plażami).
function scoreCandidate(
  place: Place,
  context: {
    pool: Place[];
    noclegi: Nocleg[];
    poolCentroid: { lat: number; lng: number } | null;
    maxCentroidDistanceKm: number;
    totalDistinctTagsInPool: number;
  },
): BaseQualityScore {
  const nearby = nearbyMatches(context.pool, place, BASE_SEARCH_RADIUS_KM);
  const hasLodging = hasConfirmedLodging(place, context.noclegi);
  const centrality = centralityBonusFor(place, context.poolCentroid, context.maxCentroidDistanceKm);
  const diversity = diversityBonusFor(nearby, context.totalDistinctTagsInPool);
  const size = settlementSizeBonusFor(place);

  return {
    nearbyCount: nearby.length,
    hasLodging,
    centralityBonus: centrality,
    diversityBonus: diversity,
    settlementSizeBonus: size,
    total: nearby.length + (hasLodging ? LODGING_BONUS : 0) + centrality + diversity + size,
  };
}

// Wybiera do MAX_BASE_CANDIDATES kandydatów na bazę wypadową spośród
// `places`: miejsca z największą "gęstością" innych pasujących miejsc w
// promieniu BASE_SEARCH_RADIUS_KM — to one najlepiej nadają się na
// centralny punkt noclegowy.
//
// PRIORYTET dla naszych miejsc kuratorskich (zgłoszenie 05.09: Łeba, mimo
// pełnego opisu redakcyjnego i wysokiej gęstości, znikała z propozycji
// tylko dlatego, że leżała ~27 km od już wybranego Rowy — obie to jednak
// dwie różne, w pełni opisane kuratorskie miejscowości, nie duplikat).
// Dlatego kuratorskie miejsca NIGDY nie wykluczają się nawzajem po
// odległości — każde było już indywidualnie zweryfikowane redakcyjnie,
// więc ufamy, że to realnie różne propozycje, nawet blisko siebie na
// wąskim pasie wybrzeża. Miejsca "basic" (Geoapify) uzupełniają wolne
// miejsca na liście TYLKO gdy kuratorskich jest za mało, i tam odległość
// od już wybranych (patrz MIN_DISTANCE_BETWEEN_BASES_KM) nadal się liczy
// — te dane nie przechodzą redakcyjnej weryfikacji i realnie potrafią się
// dublować.
export function suggestBaseCandidates(
  places: Place[],
  options: Pick<RouteOptions, "interests" | "regionTypes" | "surroundings" | "nearbyAttractions">,
  // Opcjonalny, domyślnie pusty — istniejące wywołania (i wszystkie testy
  // sprzed zgłoszenia 06.09) nie muszą go znać. Bez tabeli `noclegi`
  // hasConfirmedLodging spada na samo Place.recommendedCampsites (patrz
  // komentarz przy Kryterium 1 wyżej) zamiast łamać się na braku danych.
  noclegi: Nocleg[] = [],
): BaseCandidate[] {
  const matching = filterCandidates(places, options);
  // Ten sam kompromis co MIN_MATCHING_CURATED_PLACES w getRoutePlaces.ts —
  // gdy filtr zainteresowań zostawia za mało miejsc, żeby cokolwiek ocenić,
  // lepiej zaproponować bazy z całej puli niż nie zaproponować niczego.
  const pool = matching.length >= MIN_BASE_CANDIDATES_BEFORE_FALLBACK ? matching : places;

  // Kontekst wspólny dla WSZYSTKICH kandydatów w tym wywołaniu — liczony
  // raz, nie per kandydat, żeby centralność/różnorodność (patrz kryteria
  // 2 i 4 wyżej) były spójnie znormalizowane względem tej samej puli.
  const poolCentroid = centroid(pool);
  const totalDistinctTagsInPool = distinctTags(pool).size;

  const eligible = pool.filter((place) => !isIneligibleAsBaseCandidate(place));
  const centroidDistances = poolCentroid
    ? eligible.map((place) => distanceKm(place, poolCentroid))
    : [0];
  const maxCentroidDistanceKm = Math.max(...centroidDistances, 0);

  const scored = eligible
    .map((place) => ({
      place,
      score: scoreCandidate(place, {
        pool,
        noclegi,
        poolCentroid,
        maxCentroidDistanceKm,
        totalDistinctTagsInPool,
      }),
    }))
    // Malejąco po łącznym wyniku; przy remisie (częste przy małych
    // regionach, gdzie wiele wag wychodzi identycznie) tytuł jako ostatni,
    // czysto techniczny tiebreaker — żeby kolejność była deterministyczna,
    // nie zależała od niegwarantowanej kolejności wejściowej tablicy.
    .sort((a, b) => b.score.total - a.score.total || a.place.title.localeCompare(b.place.title));

  const curatedScored = scored.filter((c) => c.place.source !== "basic");
  const basicScored = scored.filter((c) => c.place.source === "basic");

  const selected: { place: Place; score: BaseQualityScore }[] = [];

  for (const candidate of curatedScored) {
    if (selected.length >= MAX_BASE_CANDIDATES) break;
    selected.push(candidate);
  }

  for (const candidate of basicScored) {
    if (selected.length >= MAX_BASE_CANDIDATES) break;
    const tooCloseToExisting = selected.some(
      (s) => distanceKm(s.place, candidate.place) < MIN_DISTANCE_BETWEEN_BASES_KM,
    );
    if (tooCloseToExisting) continue;
    selected.push(candidate);
  }

  return selected.map(({ place, score }) => ({
    slug: place.slug,
    title: place.title,
    description: place.description,
    lat: place.lat,
    lng: place.lng,
    image: place.image,
    imageAlt: place.imageAlt,
    imagePosition: place.imagePosition,
    source: place.source ?? "curated",
    basicPlaceIcon: place.basicPlaceIcon,
    mapIcon: getPlaceMapIcon(place),
    nearbyCount: score.nearbyCount,
    radiusKm: BASE_SEARCH_RADIUS_KM,
  }));
}

export type NearbyPlaceWithDistance = { place: Place; distanceKm: number };

// Miejsca "w zasięgu" wybranej bazy, z dystansem, posortowane od
// najbliższego, do pokazania na tymczasowym widoku /planer/baza — patrz
// BaseRadiusExplorer.tsx. Liczy raz, do DETAIL_MAX_RADIUS_KM (górny koniec
// suwaka), żeby przesuwanie suwaka na kliencie mogło tylko FILTROWAĆ już
// policzoną listę, bez ponownego przeliczania odległości ani nowego
// zapytania do serwera przy każdym ruchu suwaka.
export function nearbyPlacesWithDistance(
  places: Place[],
  base: { slug: string; lat: number; lng: number },
  maxRadiusKm: number = DETAIL_MAX_RADIUS_KM,
): NearbyPlaceWithDistance[] {
  return places
    .filter((p) => p.slug !== base.slug)
    .map((place) => ({ place, distanceKm: distanceKm(base, place) }))
    .filter((entry) => entry.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// Ogranicza pulę do jednego podregionu wybrzeża (Zachodnie/Środkowe/
// Wschodnie) — CELOWA, osobna kopia identycznej reguły przynależności co
// withinSubRegion w generateRoute.ts (miejsca "basic" po tagu regionu z
// getRoutePlaces.ts, miejsca kuratorskie po odległości od kotwic
// podregionu), a NIE import z generateRoute.ts — patrz komentarz na górze
// pliku: ta ścieżka ma zostać w 100% niezależna od pliku z algorytmem
// najbliższego sąsiada, nawet kosztem odrobiny duplikacji.
const CURATED_SUB_REGION_RADIUS_KM = 120;

// Promień 120 km wokół kotwic (jak wyżej) sam w sobie jest CELOWO luźny —
// sąsiednie podregiony (np. Środkowe/Zachodnie) leżą bliżej siebie niż
// 120 km, więc same kotwice/promień potrafią złapać miejsce z SĄSIEDNIEGO
// podregionu (zaobserwowane na żywo: Kołobrzeg — kotwica Zachodniego —
// wpadał też do puli Środkowego). W generateRoute.ts to koryguje osobny,
// twardy strażnik (enforceSubRegionBounds) PO ułożeniu trasy; tu, bez
// takiego etapu, granica `bounds` musi być sprawdzona od razu, dla
// WSZYSTKICH miejsc (kuratorskich i "basic" — tag regionu w danych też
// może się mylić, patrz ten sam komentarz w generateRoute.ts).
// Zgłoszenie 05.09 (mapy z ikonami kategorii): `icon` domyślnie neutralne
// 📍 dla fallbackowych kotwic (bez przypisanego konkretnego miejsca, patrz
// niżej) — realne kandydaci zawsze niosą swoje mapIcon z BaseCandidate.
export type PreviewPin = { lat: number; lng: number; title: string; icon: string };

// Miniatura mapy na Poziomie 1 (wybór podregionu) ma pokazywać to, co
// USER FAKTYCZNIE zobaczy po kliknięciu — nie stałe, orientacyjne kotwice
// z poland.ts (używane gdzie indziej wyłącznie do wyznaczania promienia
// wyszukiwania Geoapify, patrz SubRegion.anchors). Zgłoszenie 05.09
// (pierwsza część): mapa pokazywała 3 kotwice, a lista kart niżej — inną
// liczbę i inne miejsca, bo to dwa niezależne źródła danych.
//
// Zgłoszenie 05.09 (druga kontynuacja): NAWET realne kuratorskie miejsca
// nie wystarczały — funkcja sama filtrowała po granicach i parkach
// narodowych (`isProtectedArea`, patrz historia gita), czyli była TRZECIM,
// osobnym doborem miejsc, niezależnym od suggestBaseCandidates, które
// faktyczne wybiera kandydatów na Poziomie 2 (gęstość sąsiadów,
// priorytet kuratorskich, MAX_BASE_CANDIDATES...). Dwa niezależne dobory
// tego samego zbioru nieuchronnie prędzej czy później się rozjadą.
//
// Rozwiązanie: ta funkcja NIE dobiera już niczego sama — przyjmuje
// gotowe `BaseCandidate[]` z suggestBaseCandidates (wywołanego dla
// KAŻDEGO podregionu dokładnie tak samo jak dla wybranego podregionu na
// Poziomie 2, patrz /planer/bazy/page.tsx) i mapuje WSZYSTKIE (bez
// żadnego limitu/slice) na piny — Poziom 1 pokazuje więc dokładnie te
// same miejsca, w tej samej liczbie, co pełna lista kart o piętro niżej.
// Wyklucza to jednocześnie parki narodowe bez osobnego filtra: skoro
// suggestBaseCandidates już ich nie zwraca, nie mogą trafić i tutaj.
//
// Zwraca `title` (nie same współrzędne) — podpis tekstowy pod miniaturą
// MUSI być zbudowany z TYCH SAMYCH obiektów co pineski na mapie (patrz
// subRegionCaption w /planer/bazy/page.tsx), inaczej liczba wymienionych
// miejscowości w tekście mogłaby się rozjechać z liczbą pinesek.
//
// Fallback na kotwice (bez tytułów) zdarza się tylko wtedy, gdy dla
// danego podregionu suggestBaseCandidates nie zwróciło ŻADNEGO
// kandydata — nie powinno się zdarzyć dla obsługiwanych dziś podregionów
// wybrzeża, ale miniatura nigdy nie zostaje wtedy pusta.
export function pinsFromBaseCandidates(
  candidates: BaseCandidate[],
  fallbackAnchors: { lat: number; lng: number }[],
): PreviewPin[] {
  const pins = candidates.map((c) => ({ lat: c.lat, lng: c.lng, title: c.title, icon: c.mapIcon }));
  return pins.length > 0 ? pins : fallbackAnchors.map((a) => ({ ...a, title: "", icon: "📍" }));
}

export function restrictToSubRegion(
  places: Place[],
  subRegionId: string,
  anchors: { lat: number; lng: number }[],
  bounds: Bounds,
): Place[] {
  return places
    .filter((place) =>
      place.source === "basic"
        ? place.region === subRegionId
        : anchors.some((anchor) => distanceKm(anchor, place) <= CURATED_SUB_REGION_RADIUS_KM),
    )
    .filter((place) => isWithinBounds({ lat: place.lat, lng: place.lng }, bounds));
}
