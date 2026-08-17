import Image from "next/image";
import { notFound } from "next/navigation";
import { getPlaceBySlug } from "@/lib/getPlaces";
import { activePlacesProvider } from "@/lib/placesProviders";
import type { ExternalPlaceResult } from "@/lib/placesProviders";
import { getPlaceSaveStatus } from "@/lib/userPlaces";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

// Miejsca "podstawowe" (z Geoapify) nie mają własnego rekordu w Supabase
// — ich dane nigdy nie są zapisywane, powstają tylko na czas generowania
// trasy. Slug takiego miejsca to zawsze "<id-dostawcy>-<jego-id>" (patrz
// toBasicPlace w getRoutePlaces.ts), więc rozpoznajemy je po prefiksie i
// dociągamy dane ponownie, na żywo, zamiast pytać Supabase. Ulubione/
// odwiedzone działają tak samo dla nich jak dla miejsc kuratorskich —
// tabele favorites/visited trzymają slug jako zwykły tekst, bez wymogu,
// żeby istniał w tabeli places.
async function BasicPlacePage({
  slug,
  result,
}: {
  slug: string;
  result: ExternalPlaceResult;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lng}`;
  const { isFavorite, isVisited } = await getPlaceSaveStatus(slug);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/miejsca" label="Powrót do listy miejsc" />

        {/* Neutralna, przyciszona odznaka — celowo bez koloru z palety
            (bordo/bursztyn/turkus), żeby kontrastować z bursztynową
            odznaką "Kuratorskie"/"★ Poleca przewodnik" i wizualnie
            oznaczać miejsca "podstawowe" jako mniej wyróżnione. */}
        <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-400">
          Odkryj więcej — miejsce spoza naszej kuratorskiej bazy
        </span>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {result.title}
        </h1>

        {result.image && (
          <div className="mt-6 overflow-hidden rounded-xl">
            {/* Zdjęcia z Geoapify pochodzą z różnych domen — next/image
                wymagałby zarejestrowania każdej z nich w next.config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.image}
              alt={result.imageAlt}
              className="h-72 w-full object-cover"
            />
          </div>
        )}

        <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {result.description}
        </p>

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-500">
          Współrzędne: {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-black/[.08] px-4 py-3 text-sm font-medium text-black hover:border-wine/50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-wine/50"
          >
            Otwórz w Mapach Google
          </a>
          {result.sourceUrl && (
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/[.08] px-4 py-3 text-sm font-medium text-black hover:border-wine/50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-wine/50"
            >
              Zobacz źródło ↗
            </a>
          )}
        </div>

        <div className="mt-4">
          <SavePlaceButtons
            place={{
              slug,
              title: result.title,
              image: result.image,
              imageAlt: result.imageAlt,
              source: "basic",
            }}
            initialFavorite={isFavorite}
            initialVisited={isVisited}
          />
        </div>
      </main>
    </div>
  );
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const basicPrefix = `${activePlacesProvider.id}-`;
  if (slug.startsWith(basicPrefix) && activePlacesProvider.fetchPlaceDetails) {
    const externalId = slug.slice(basicPrefix.length);
    const result = await activePlacesProvider.fetchPlaceDetails(externalId);
    if (!result) notFound();
    return <BasicPlacePage slug={slug} result={result} />;
  }

  const place = await getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const { isFavorite, isVisited } = await getPlaceSaveStatus(slug);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/miejsca" label="Powrót do listy miejsc" />

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {place.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          {place.region}
        </p>

        <div className="mt-6 overflow-hidden rounded-xl">
          <Image
            src={place.image}
            alt={place.imageAlt}
            width={896}
            height={500}
            className={`h-72 w-full object-cover ${
              place.imagePosition === "top" ? "object-top" : "object-center"
            }`}
            priority
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
          Zdjęcie: {place.credit.author}, {place.credit.license}, Wikimedia
          Commons
        </p>

        <div className="mt-4">
          <SavePlaceButtons
            place={{
              slug: place.slug,
              title: place.title,
              image: place.image,
              imageAlt: place.imageAlt,
              source: place.source ?? "curated",
            }}
            initialFavorite={isFavorite}
            initialVisited={isVisited}
          />
        </div>

        <div className="mt-6 flex flex-col gap-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {/* longDescription może mieć kilka akapitów rozdzielonych pustą
              linią (np. wstęp / kontekst / "co warto poczuć" / info
              praktyczne) — bez tego renderowałyby się jako jedna,
              nieprzerwana ściana tekstu. */}
          {place.longDescription.split(/\n\s*\n/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {place.culinaryTip && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Co spróbować na miejscu
            </h2>
            <p className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
              {place.culinaryTip}
            </p>
          </div>
        )}

        {place.recommendedCampsites.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Gdzie się zatrzymać
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-zinc-600 dark:text-zinc-400">
              {place.recommendedCampsites.map((campsite) => (
                <li key={campsite}>{campsite}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-500">
          Współrzędne: {place.lat}, {place.lng}
        </p>
      </main>
    </div>
  );
}
