import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveTrip } from "@/lib/activeTrip";
import { getPlaces } from "@/lib/getPlaces";
import { nearbyPlacesWithDistance, DETAIL_MAX_RADIUS_KM } from "@/lib/suggestBases";
import { fetchCurrentWeather, describeWeatherCode, classifyWeatherMood } from "@/lib/weather";
import { remainingTripDays, prioritizeForToday, describePriorityMode } from "@/lib/dzisPrioritization";
import BackButton from "@/components/BackButton";
import BaseRadiusExplorer from "@/components/BaseRadiusExplorer";
import EndActiveTripButton from "@/components/EndActiveTripButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Zgłoszenie 06.09: "Dziś w [baza]" — na razie (ten krok) pokazuje
// PODSTAWOWĄ listę atrakcji w promieniu zapisanej bazy, bez dodatkowego
// filtrowania pogodowego (to ma dojść w kolejnym kroku, patrz zgłoszenie).
// Celowo licząc odległości względem CAŁEJ kuratorskiej bazy (getPlaces,
// bez Geoapify) — nie odtwarzamy tu oryginalnych filtrów zainteresowań/
// otoczenia z formularza Planera, z którym baza została pierwotnie
// wybrana (suggestBaseCandidates). Ta strona ma inny cel: "co mam w
// zasięgu, skoro tu już jestem", nie "jaka baza najlepiej pasuje do moich
// preferencji" — więc szerszy, nieprzefiltrowany widok jest tu bardziej
// przydatny niż wąski dobór sprzed rozpoczęcia podróży.
export default async function DzisPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/dzis");
  }

  const trip = await getActiveTrip();

  if (!trip) {
    // Bezpośrednie wejście na /dzis (np. zakładka w przeglądarce) już PO
    // zakończeniu podróży albo bez jej wcześniejszego zapisania — boczne
    // menu w ogóle nie pokazuje wtedy tej pozycji (patrz SideDrawer.tsx),
    // ale strona sama musi dać sensowną odpowiedź, nie pusty ekran.
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="mx-auto max-w-3xl px-6 py-16">
          <BackButton fallbackHref="/" label="Wstecz" />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Nie masz jeszcze aktywnej podróży
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Wybierz bazę wypadową w Planerze i zapisz ją jako aktywną
            podróż, żeby zobaczyć tutaj, co masz w zasięgu.
          </p>
          <Link
            href="/planer"
            className="mt-6 inline-block rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover"
          >
            Zaplanuj podróż
          </Link>
        </main>
      </div>
    );
  }

  const curated = await getPlaces();
  const rawNearby = nearbyPlacesWithDistance(
    curated,
    { slug: trip.baseSlug, lat: trip.baseLat, lng: trip.baseLng },
    DETAIL_MAX_RADIUS_KM,
  );

  // Zgłoszenie 06.09: aktualna pogoda NA MIEJSCU (współrzędne zapisanej
  // bazy), nie prognoza — patrz komentarz w weather.ts. `null`, gdy
  // Open-Meteo jest niedostępne (fail-open: strona działa dalej, po
  // prostu bez widżetu pogody i bez sortowania po pogodzie).
  const weather = await fetchCurrentWeather(trip.baseLat, trip.baseLng);
  const weatherMood = weather ? classifyWeatherMood(weather) : null;
  const weatherDisplay = weather ? describeWeatherCode(weather.weatherCode) : null;

  const remainingDays = remainingTripDays(trip.startDate, trip.days);
  const nearby = prioritizeForToday(rawNearby, { weatherMood, remainingDays });
  const priorityNote = describePriorityMode(weatherMood, remainingDays);

  const startDateLabel = new Date(trip.startDate).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/" label="Wstecz" />

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Dziś w {trip.baseTitle}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {trip.region} · start {startDateLabel} · {trip.days}{" "}
          {trip.days === 1 ? "dzień" : "dni"} zaplanowane
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {weather && weatherDisplay && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[.08] bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-300">
              <span aria-hidden>{weatherDisplay.emoji}</span>
              {weatherDisplay.label} · {Math.round(weather.temperatureC)}°C
              {weather.precipitationMm > 0 ? ` · ${weather.precipitationMm.toFixed(1)} mm opadu` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[.08] bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-300">
            <span aria-hidden>📅</span>
            {remainingDays === 0
              ? "Ostatni dzień podróży"
              : `Zostało ${remainingDays} ${remainingDays === 1 ? "dzień" : "dni"}`}
          </span>
        </div>
        {/* Pogoda niedostępna (Open-Meteo nie odpowiedziało) — strona
            działa dalej, po prostu bez tego widżetu i bez sortowania po
            pogodzie (patrz weather.ts, fetchCurrentWeather: fail-open). */}
        {!weather && (
          <p className="mt-2 text-xs text-zinc-500">
            Nie udało się pobrać aktualnej pogody — lista poniżej jest posortowana bez jej uwzględnienia.
          </p>
        )}
        {priorityNote && (
          <p className="mt-2 text-xs text-zinc-500">{priorityNote}</p>
        )}

        <BaseRadiusExplorer
          base={{ lat: trip.baseLat, lng: trip.baseLng, title: trip.baseTitle }}
          nearby={nearby}
        />

        <EndActiveTripButton />
      </main>
    </div>
  );
}
