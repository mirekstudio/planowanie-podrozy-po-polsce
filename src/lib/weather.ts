// Zgłoszenie 06.09 (ekran "Dziś w [baza]", pkt 1): appka NIGDY wcześniej
// nie miała żadnej integracji pogodowej (sprawdzone — zero wzmianek o
// Open-Meteo/OpenWeatherMap w całym kodzie) — ten moduł buduje ją od
// zera. Open-Meteo wybrane bo jest darmowe i nie wymaga klucza API (ten
// sam powód co przy Geoapify — patrz geoapify.ts), ani rejestracji.
//
// Celowo endpoint "current", NIE "hourly"/"daily" (prognoza) — ekran
// "Dziś w [baza]" pyta o pogodę "tu i teraz, na miejscu", nie o to, jaka
// będzie jutro. `cache: "no-store"` z tego samego powodu: to ma być
// zawsze świeży odczyt, nigdy zbuforowana odpowiedź sprzed godzin.

export type CurrentWeather = {
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number;
};

// Appka rozróżnia pogodę tylko na tyle, ile potrzeba do sortowania
// atrakcji (wymóg 4) — "rain" obejmuje też śnieg/burzę (każdy opad
// zniechęcający do plenerowego zwiedzania), nie tylko dosłowny deszcz.
export type WeatherMood = "rain" | "nice" | "neutral";

// Tabela kodów WMO zwracanych przez Open-Meteo — https://open-meteo.com/en/docs
// (sekcja "WMO Weather interpretation codes"), spolszczona do krótkich,
// czytelnych etykiet na potrzeby widżetu na ekranie "Dziś w [baza]".
const WEATHER_CODE_LABELS: Record<number, { emoji: string; label: string }> = {
  0: { emoji: "☀️", label: "Bezchmurnie" },
  1: { emoji: "🌤️", label: "Prawie bezchmurnie" },
  2: { emoji: "⛅", label: "Częściowe zachmurzenie" },
  3: { emoji: "☁️", label: "Zachmurzenie duże" },
  45: { emoji: "🌫️", label: "Mgła" },
  48: { emoji: "🌫️", label: "Mgła osadzająca szron" },
  51: { emoji: "🌦️", label: "Lekka mżawka" },
  53: { emoji: "🌦️", label: "Mżawka" },
  55: { emoji: "🌦️", label: "Gęsta mżawka" },
  56: { emoji: "🌦️", label: "Marznąca mżawka" },
  57: { emoji: "🌦️", label: "Gęsta marznąca mżawka" },
  61: { emoji: "🌧️", label: "Słaby deszcz" },
  63: { emoji: "🌧️", label: "Deszcz" },
  65: { emoji: "🌧️", label: "Silny deszcz" },
  66: { emoji: "🌧️", label: "Marznący deszcz" },
  67: { emoji: "🌧️", label: "Silny marznący deszcz" },
  71: { emoji: "🌨️", label: "Słaby śnieg" },
  73: { emoji: "🌨️", label: "Śnieg" },
  75: { emoji: "🌨️", label: "Silny śnieg" },
  77: { emoji: "🌨️", label: "Śnieg ziarnisty" },
  80: { emoji: "🌦️", label: "Przelotny deszcz" },
  81: { emoji: "🌦️", label: "Przelotny deszcz" },
  82: { emoji: "🌦️", label: "Gwałtowny przelotny deszcz" },
  85: { emoji: "🌨️", label: "Przelotny śnieg" },
  86: { emoji: "🌨️", label: "Silny przelotny śnieg" },
  95: { emoji: "⛈️", label: "Burza" },
  96: { emoji: "⛈️", label: "Burza z gradem" },
  99: { emoji: "⛈️", label: "Silna burza z gradem" },
};

export function describeWeatherCode(code: number): { emoji: string; label: string } {
  return WEATHER_CODE_LABELS[code] ?? { emoji: "🌡️", label: "Pogoda" };
}

// Opady (deszcz/mżawka/śnieg/burza) — patrz komentarz przy WeatherMood.
// Celowo BEZ kodów mgły (45/48) i dużego zachmurzenia (3) — to nie jest
// pogoda, która sama w sobie każe uciekać do wnętrza.
const RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
]);
// Bezchmurnie/prawie bezchmurnie/częściowe zachmurzenie — pogoda, przy
// której warto priorytetyzować plener (wymóg 4).
const NICE_CODES = new Set([0, 1, 2]);

export function classifyWeatherMood(weather: CurrentWeather): WeatherMood {
  // precipitationMm jako niezależna, druga linia obrony — na wypadek gdyby
  // Open-Meteo kiedyś zwróciło realny opad przy kodzie spoza RAIN_CODES
  // (ten sam wzorzec "belt and suspenders" co w geoapify.ts).
  if (weather.precipitationMm > 0.1 || RAIN_CODES.has(weather.weatherCode)) return "rain";
  if (NICE_CODES.has(weather.weatherCode)) return "nice";
  return "neutral";
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// Nigdy nie rzuca wyjątku — brak pogody ma degradować ekran "Dziś w
// [baza]" do stanu sprzed tego kroku (lista bez uwzględnienia pogody), nie
// psuć całej strony. Ten sam wzorzec fail-open co fetchProtectedPlaces w
// geoapify.ts (sieć/dostawca niedostępny → pusty/null wynik, nie wyjątek).
export async function fetchCurrentWeather(
  lat: number,
  lng: number,
): Promise<CurrentWeather | null> {
  try {
    const url =
      `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,precipitation,weather_code&timezone=auto`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    const current = data.current;
    if (!current || typeof current.temperature_2m !== "number") return null;

    return {
      temperatureC: current.temperature_2m,
      precipitationMm: current.precipitation ?? 0,
      weatherCode: current.weather_code,
    };
  } catch {
    return null;
  }
}
