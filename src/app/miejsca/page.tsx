import Image from "next/image";
import Link from "next/link";
import { getPlaces } from "@/lib/getPlaces";

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
  const allPlaces = await getPlaces();
  const places = isPolecane
    ? allPlaces.filter((place) => place.featured)
    : kategoria
      ? allPlaces.filter((place) => place.tags.includes(kategoria))
      : allPlaces;

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
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
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
            className="mt-3 inline-block text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
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
              <Link
                href={`/miejsca/${place.slug}`}
                className="block h-full overflow-hidden rounded-xl border border-black/[.08] bg-white transition-colors hover:border-black/[.2] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-white/[.3]"
              >
                <Image
                  src={place.image}
                  alt={place.imageAlt}
                  width={640}
                  height={360}
                  className={`h-40 w-full object-cover ${
                    place.imagePosition === "top" ? "object-top" : "object-center"
                  }`}
                />
                <div className="p-5">
                  <h2 className="text-xl font-medium text-black dark:text-zinc-50">
                    {place.title}
                  </h2>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    {place.description}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        )}
      </main>
    </div>
  );
}
