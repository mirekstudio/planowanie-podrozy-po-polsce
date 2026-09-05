import type { Place } from "@/data/places";

// Zgłoszenie 05.09: pineski na mapach (trasa, podregion, promień bazy,
// /mapa) mają pokazywać ikonę KATEGORII miejsca (🗼 latarnia, 🏰 zamek,
// 🏖️ plaża...), nie jednolitą kropkę/numer bez żadnej informacji o typie
// miejsca.
//
// Dla miejsc "podstawowych" (Geoapify) ikona jest już policzona —
// Place.basicPlaceIcon, ustawiane w toBasicPlace/toBasicCategoryPlace na
// podstawie getCategoryDisplay(categories, name) w geoapify.ts. To
// dopasowanie już zawiera poprawkę po nazwie dla lasów/rezerwatów/wąwozów
// (patrz applyNameOverride w geoapifyCategoryDisplay.ts), więc nic więcej
// nie trzeba tu robić dla tej ścieżki.
//
// Dla miejsc KURATORSKICH nie da się użyć TEJ SAMEJ funkcji z tymi samymi
// danymi — getCategoryDisplay dopasowuje surowe kategorie Geoapify (np.
// "tourism.sights.castle"), a miejsca kuratorskie mają zupełnie inny,
// własny redakcyjny słownik (Place.tags — sprawdzone bezpośrednio w
// produkcyjnej bazie: tylko 7 realnie używanych tagów: "Historia",
// "Natura", "Architektura", "Zamki i Pałace", "Parki Narodowe",
// "Aktywność fizyczna", "Relaks"). Osobna tabela niżej, ale CELOWO reużywa
// te same ikony co getCategoryDisplay tam, gdzie znaczenie jest tożsame
// (zamek, park narodowy) — żeby mapa mówiła jednym wizualnym językiem
// niezależnie od źródła danych, mimo że dopasowanie techniczne musi być
// osobne.
//
// Kolejność od najbardziej do najmniej specyficznego — jedno miejsce
// kuratorskie zwykle ma KILKA tagów naraz (np. zamek otagowany i "Zamki i
// Pałace", i "Historia", i "Architektura"), więc bardziej charakterystyczny
// tag (zamek) musi wygrać z ogólniejszym (historia/architektura).
const CURATED_TAG_ICONS: { tag: string; icon: string }[] = [
  { tag: "Parki Narodowe", icon: "🌲" },
  { tag: "Zamki i Pałace", icon: "🏰" },
  { tag: "Aktywność fizyczna", icon: "🚴" },
  { tag: "Relaks", icon: "🧘" },
  { tag: "Architektura", icon: "🏛️" },
  { tag: "Historia", icon: "📜" },
  { tag: "Natura", icon: "🌿" },
];

// Ten sam neutralny fallback co DEFAULT_CATEGORY_DISPLAY w
// geoapifyCategoryDisplay.ts — spójność, gdy żaden tag/kategoria nie pasuje.
const DEFAULT_MAP_ICON = "📍";

// Zgłoszenie 05.09 (kontynuacja): nasza redakcyjna taksonomia ma tylko 7
// szerokich tagów (patrz wyżej) — bez osobnej kategorii "latarnia" czy
// "kościół". Realny dowód (sprawdzony bezpośrednio w produkcyjnej bazie):
// "Latarnia Morska Rozewie" ma tagi ["Historia","Architektura"] — bez tej
// poprawki dostałaby ogólną ikonę 🏛️ zamiast 🗼, mimo że jej redakcyjny
// TYTUŁ jednoznacznie mówi, czym jest. W przeciwieństwie do dopasowania
// po nazwie dla miejsc Geoapify (surowe, czasem mylące nazwy z OSM) tu
// tytuły są redakcyjnie napisane i sprawdzone — dopasowanie po słowie
// kluczowym jest więc bardzo pewne, dlatego sprawdzane PRZED tagami, nie
// jako poprawka na wypadek pomyłki.
const CURATED_NAME_ICON_RULES: { pattern: RegExp; icon: string }[] = [
  { pattern: /latarni[ae]/i, icon: "🗼" },
  { pattern: /kościół|katedra|bazylik|kaplic|klasztor|sanktuari/i, icon: "⛪" },
  { pattern: /\bmolo\b/i, icon: "🌊" },
  { pattern: /wydm/i, icon: "🏜️" },
  { pattern: /rezerwat/i, icon: "🌿" },
  { pattern: /twierdz|\bfort(?:ec[ay])?\b/i, icon: "🏰" },
  { pattern: /ruin/i, icon: "🏚️" },
  { pattern: /pomnik/i, icon: "🗿" },
  { pattern: /\bplaż/i, icon: "🏖️" },
];

export function getPlaceMapIcon(
  place: Pick<Place, "source" | "tags" | "basicPlaceIcon" | "title">,
): string {
  if (place.source === "basic") {
    return place.basicPlaceIcon || DEFAULT_MAP_ICON;
  }

  for (const rule of CURATED_NAME_ICON_RULES) {
    if (rule.pattern.test(place.title)) return rule.icon;
  }

  for (const { tag, icon } of CURATED_TAG_ICONS) {
    if (place.tags.includes(tag)) return icon;
  }

  return DEFAULT_MAP_ICON;
}
