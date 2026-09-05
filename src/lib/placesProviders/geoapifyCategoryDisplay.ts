// Zgłoszenie 05.09: karty miejsc "podstawowych" (Geoapify, odznaka "Odkryj
// więcej") mają wizualnie bardziej przypominać kuratorskie — w granicach
// tego, co Geoapify faktycznie daje. Ten moduł odpowiada za DWIE rzeczy,
// obie budowane z tych samych, surowych kategorii Geoapify
// (feature.properties.categories — ten sam sygnał, którego już używają
// looksLikeNonTouristPlace i inne filtry w geoapify.ts):
//
// 1. Neutralny placeholder graficzny dopasowany do TYPU miejsca (nie
//    jedna uniwersalna pinezka 📍 dla wszystkiego), gdy miejsce nie ma
//    żadnego prawdziwego zdjęcia.
// 2. Krótka, czytelna etykieta kategorii (np. "Punkt widokowy") do
//    budowania zwięzłego opisu zamiast surowego adresu pocztowego — patrz
//    buildBasicPlaceDescription w geoapify.ts.
//
// Reguły są uporządkowane od NAJBARDZIEJ do najmniej specyficznej —
// dopasowanie zatrzymuje się na pierwszej pasującej regule, więc np.
// "tourism.sights.castle" musi stać przed ogólnym "tourism.sights",
// inaczej zamek zawsze wpadałby w ogólny "Zabytek". Dopasowanie po
// każdej kategorii z osobna (nie tylko pierwszej), bo Geoapify zwraca
// całą listę pasujących kategorii naraz, w niegwarantowanej kolejności.
export type CategoryDisplay = { label: string; icon: string };

const CATEGORY_DISPLAY_RULES: (CategoryDisplay & { prefix: string })[] = [
  { prefix: "man_made.lighthouse", label: "Latarnia morska", icon: "🗼" },
  { prefix: "tourism.sights.lighthouse", label: "Latarnia morska", icon: "🗼" },
  { prefix: "tourism.sights.castle", label: "Zamek", icon: "🏰" },
  { prefix: "tourism.sights.fort", label: "Twierdza", icon: "🏰" },
  { prefix: "tourism.sights.ruines", label: "Ruiny", icon: "🏚️" },
  { prefix: "tourism.sights.manor", label: "Pałac lub dwór", icon: "🏛️" },
  { prefix: "tourism.sights.memorial", label: "Pomnik", icon: "🗿" },
  { prefix: "tourism.sights.archaeological_site", label: "Stanowisko archeologiczne", icon: "🏺" },
  { prefix: "tourism.sights.battlefield", label: "Miejsce historyczne", icon: "⚔️" },
  { prefix: "tourism.sights.place_of_worship", label: "Obiekt sakralny", icon: "⛪" },
  { prefix: "religion.place_of_worship", label: "Obiekt sakralny", icon: "⛪" },
  { prefix: "tourism.attraction.viewpoint", label: "Punkt widokowy", icon: "🔭" },
  { prefix: "national_park", label: "Park narodowy", icon: "🌲" },
  { prefix: "leisure.park.nature_reserve", label: "Rezerwat przyrody", icon: "🌿" },
  { prefix: "natural.sand.dune", label: "Wydmy", icon: "🏜️" },
  { prefix: "natural.coastal", label: "Wybrzeże", icon: "🏝️" },
  { prefix: "natural.water", label: "Zbiornik wodny", icon: "💧" },
  { prefix: "beach.beach_resort", label: "Kurort nadmorski", icon: "🏖️" },
  { prefix: "beach", label: "Plaża", icon: "🏖️" },
  { prefix: "camping", label: "Pole namiotowe / kemping", icon: "⛺" },
  { prefix: "man_made.pier", label: "Molo", icon: "🌊" },
  { prefix: "leisure.spa", label: "Uzdrowisko / SPA", icon: "💆" },
  { prefix: "entertainment.activity_park", label: "Park rozrywki", icon: "🎡" },
  { prefix: "leisure.park", label: "Park", icon: "🌳" },
  { prefix: "sport", label: "Obiekt sportowy", icon: "🚴" },
  { prefix: "building.historic", label: "Zabytek", icon: "🏛️" },
  { prefix: "heritage", label: "Zabytek", icon: "🏛️" },
  { prefix: "tourism.sights", label: "Zabytek", icon: "🏛️" },
  { prefix: "tourism.attraction", label: "Atrakcja turystyczna", icon: "📍" },
  { prefix: "natural", label: "Miejsce przyrodnicze", icon: "🌿" },
];

// Gdy kategorie w ogóle nie przyszły, albo żadna nie pasuje do żadnej
// powyższej reguły — ten sam neutralny fallback, którego appka już
// używała wszędzie (pinezka 📍), tylko teraz jako OSTATNIA linia obrony,
// nie jedyna opcja.
const DEFAULT_CATEGORY_DISPLAY: CategoryDisplay = { label: "Ciekawe miejsce", icon: "📍" };

export function getCategoryDisplay(categories: string[] | undefined): CategoryDisplay {
  if (!categories || categories.length === 0) return DEFAULT_CATEGORY_DISPLAY;

  for (const rule of CATEGORY_DISPLAY_RULES) {
    const matches = categories.some(
      (category) => category === rule.prefix || category.startsWith(`${rule.prefix}.`),
    );
    if (matches) return { label: rule.label, icon: rule.icon };
  }

  return DEFAULT_CATEGORY_DISPLAY;
}
