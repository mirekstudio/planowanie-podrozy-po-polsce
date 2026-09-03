import Image from "next/image";
import Link from "next/link";
import type { Place } from "@/data/places";
import { getPlaces } from "@/lib/getPlaces";
import { getCategoryPlaces } from "@/lib/getCategoryPlaces";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function MiejscaPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; polecane?: string }>;
}) {
  const { kategoria, polecane } = await searchParams;
  // "polecane" ma pierwszeństwo przed kategorią — to osobny, ręcznie
  // kuratorski wybór (pole featured), nie kolejny wymiar tego samego
  // filtra tagów co "kategoria".
  const isPolecane = polecane === "1";
  // Tylko widok pojedynczej kategorii dociąga uzupełnienie z Geoapify, gdy
  // w bazie jest go za mało (patrz getCategoryPlaces.ts) — "Polecane" i
  // "Wszystkie miejsca" bez filtra to z definicji czysto kuratorskie
  // widoki (ręczny wybór redakcji / cała baza), do których nie ma sensu
  // dociągać automatycznych wyników.
  const places: Place[] = isPolecane
    ? (await getPlaces()).filter((place) => place.featured)
    : kategoria
      ? await getCategoryPlaces(kategoria)
      : await getPlaces();

  // Nagłówek zawsze zaczyna się od "Wszystkie miejsca" (albo, dla widoku
  // Polecane, ma własną, jednoznaczną nazwę) — nigdy nie pokazuje nazwy
  // pojedynczego miejsca, niezależnie od tego, co akurat jest na liście.
  const heading = isPolecane
    ? "Polecane"
    : kategoria
      ? `Wszystkie miejsca — ${kategoria}`
      : "Wszystkie miejsca";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/" label="Wstecz" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {heading}
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          {isPolecane
            ? "Ręcznie wybrane miejsca, które szczególnie polecamy."
            : kategoria
              ? "Miejsca dopasowane do wybranej kategorii."
              : "Kilka przykładowych miejsc, które warto odwiedzić."}
        </p>
        {(isPolecane || kategoria) && (
          <Link
            href="/miejsca"
            className="mt-3 inline-block text-sm text-zinc-500 transition-colors hover:text-wine active:text-wine dark:text-zinc-400 dark:hover:text-wine dark:active:text-wine"
          >
            ← Wyczyść filtr, pokaż wszystkie miejsca
          </Link>
        )}

        {places.length === 0 ? (
          <p className="mt-10 text-zinc-500 dark:text-zinc-500">
            {isPolecane
              ? "Nie oznaczono jeszcze żadnych miejsc jako polecane."
              : "Brak miejsc w tej kategorii."}
          </p>
        ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {places.map((place) => (
            <li key={place.slug}>
              <PlaceCard place={place} />
            </li>
          ))}
        </ul>
        )}
      </main>
    </div>
  );
}

function PlaceCard({ place }: { place: Place }) {
  const isBasic = place.source === "basic";

  return (
    <Link
      href={`/miejsca/${place.slug}`}
      className="block h-full overflow-hidden rounded-xl border border-black/[.08] bg-white transition-colors hover:border-wine/50 hover:shadow-md active:scale-[0.98] active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-wine/50 dark:active:bg-wine/10"
    >
      {isBasic ? (
        place.image ? (
          // Zdjęcia z Geoapify pochodzą z różnych domen (zależnie od
          // miejsca) — next/image wymagałby zarejestrowania każdej z nich
          // w next.config, zwykły <img> jest prostszy i wystarczający dla
          // miniatury (ten sam wzorzec co ItineraryPlaceCard na
          // /planer/wynik).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.image}
            alt={place.imageAlt}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-zinc-100 text-3xl dark:bg-zinc-800">
            📍
          </div>
        )
      ) : (
        <Image
          src={place.image}
          alt={place.imageAlt}
          width={640}
          height={360}
          className={`h-40 w-full object-cover ${
            place.imagePosition === "top" ? "object-top" : "object-center"
          }`}
        />
      )}
      <div className="p-5">
        {/* Ten sam wzorzec oznaczania źródła co na /planer/wynik
            (ItineraryPlaceCard) — spójność UI dla rozróżnienia
            kuratorskie/podstawowe w całej appce. */}
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            isBasic
              ? "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
              : "bg-honey/10 text-honey"
          }`}
        >
          {isBasic ? "Odkryj więcej →" : "Kuratorskie"}
        </span>
        <h2 className="mt-2 text-xl font-medium text-black dark:text-zinc-50">
          {place.title}
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {place.description}
        </p>
      </div>
    </Link>
  );
}
