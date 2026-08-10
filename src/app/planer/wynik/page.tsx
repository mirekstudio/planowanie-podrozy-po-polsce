import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlaces } from "@/lib/getPlaces";
import { generateRoute } from "@/lib/generateRoute";
import MapboxRouteMapLoader from "@/components/MapboxRouteMapLoader";
import StartNavigationButton from "@/components/StartNavigationButton";

export const dynamic = "force-dynamic";

function parseNumberList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => Number(v))
    .filter((n) => !Number.isNaN(n));
}

export default async function PlanerWynikPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    interests?: string;
    transport?: string;
    travelGroup?: string;
    numAdults?: string;
    children?: string;
    startLat?: string;
    startLng?: string;
    startLabel?: string;
  }>;
}) {
  const params = await searchParams;

  if (!params.days) {
    redirect("/planer");
  }

  const days = Math.max(1, Number(params.days) || 1);
  const interests = params.interests ? params.interests.split(",") : [];
  const transport = params.transport === "camper" ? "camper" : "car";
  const travelGroup = params.travelGroup === "family" ? "family" : "adults";
  const numAdults = Math.max(1, Number(params.numAdults) || 1);
  const childrenAges = parseNumberList(params.children);

  const startPoint =
    params.startLat && params.startLng
      ? {
          lat: Number(params.startLat),
          lng: Number(params.startLng),
          label: params.startLabel ?? "Punkt startowy",
        }
      : null;

  const places = await getPlaces();
  const route = generateRoute(places, {
    days,
    interests,
    startPoint,
    childrenAges: travelGroup === "family" ? childrenAges : undefined,
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/planer"
          className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Zmień parametry
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Twoja trasa
        </h1>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
            {days} {days === 1 ? "dzień" : "dni"}
          </span>
          <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
            {transport === "camper" ? "Camper" : "Samochód"}
          </span>
          <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
            {travelGroup === "family"
              ? `Rodzina: ${numAdults} dorosłych, ${childrenAges.length} dzieci`
              : `${numAdults} dorosłych`}
          </span>
          <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
            Limit dzienny: {route.dailyHoursLimit.toFixed(1)} h
          </span>
          {startPoint && (
            <span className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
              🏁 Start: {startPoint.label}
            </span>
          )}
          {interests.map((interest) => (
            <span
              key={interest}
              className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]"
            >
              {interest}
            </span>
          ))}
        </div>

        {route.usedFallback && interests.length > 0 && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            Żadne miejsce w bazie nie pasuje do wybranych zainteresowań —
            pokazujemy trasę ze wszystkich dostępnych miejsc.
          </p>
        )}

        <div className="mt-8">
          <MapboxRouteMapLoader stops={route.stops} startPoint={startPoint} />
        </div>

        <div className="mt-4 flex justify-end">
          <StartNavigationButton stops={route.stops} startPoint={startPoint} />
        </div>

        <ol className="mt-8 flex flex-col gap-4">
          {route.days.map(({ day, places: dayPlaces }) => (
            <li
              key={day}
              className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-medium text-white dark:bg-white dark:text-black">
                  {day}
                </div>
                <span className="text-sm text-zinc-500">
                  {dayPlaces.length === 0
                    ? "Dzień wolny"
                    : `${dayPlaces.length} ${
                        dayPlaces.length === 1 ? "miejsce" : "miejsca"
                      }`}
                </span>
              </div>

              {dayPlaces.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Czas na odpoczynek lub dłuższe zwiedzanie poprzedniego
                  miejsca.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {dayPlaces.map((place) => (
                    <Link
                      key={place.slug}
                      href={`/miejsca/${place.slug}`}
                      className="flex gap-4 rounded-lg border border-black/[.08] p-3 hover:border-black/[.2] dark:border-white/[.145] dark:hover:border-white/[.3]"
                    >
                      <Image
                        src={place.image}
                        alt={place.imageAlt}
                        width={96}
                        height={96}
                        className={`h-20 w-20 shrink-0 rounded-lg object-cover ${
                          place.imagePosition === "top"
                            ? "object-top"
                            : "object-center"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-black dark:text-zinc-50">
                          {place.title}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {place.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>

        {route.stops.length > 0 && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-500">
            Łączny dystans w linii prostej: {route.totalDistanceKm.toFixed(0)}{" "}
            km
          </p>
        )}
      </main>
    </div>
  );
}
