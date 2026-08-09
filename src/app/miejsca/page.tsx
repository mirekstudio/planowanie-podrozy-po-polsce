import Image from "next/image";
import Link from "next/link";
import { getPlaces } from "@/lib/getPlaces";

export const dynamic = "force-dynamic";

export default async function MiejscaPage() {
  const places = await getPlaces();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Miejsca
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Kilka przykładowych miejsc, które warto odwiedzić.
        </p>

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
      </main>
    </div>
  );
}
