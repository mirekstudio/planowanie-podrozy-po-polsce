import Image from "next/image";
import Link from "next/link";
import { getPlaces } from "@/lib/getPlaces";

export const dynamic = "force-dynamic";

export default async function Home() {
  const places = await getPlaces();
  const teaser = places.slice(0, 4);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="relative h-[420px] overflow-hidden rounded-2xl sm:h-[480px]">
          <Image
            src="/images/biskupin.jpg"
            alt="Rekonstruowana osada obronna w Biskupinie"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

          <div className="relative flex h-full flex-col justify-end p-8 sm:p-12">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Odkryj korzenie Polski
            </h1>
            <p className="mt-4 max-w-xl text-lg text-zinc-200">
              Zaplanuj podróż po Wielkopolsce śladami początków polskiej
              państwowości — Szlakiem Piastowskim dopasowanym do Twojego
              czasu i zainteresowań.
            </p>
            <Link
              href="/planer"
              className="mt-6 inline-block self-start rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-zinc-200"
            >
              Zaplanuj podróż
            </Link>
          </div>
        </div>

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
              Przykładowe miejsca
            </h2>
            <Link
              href="/miejsca"
              className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Zobacz wszystkie →
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {teaser.map((place) => (
              <Link
                key={place.slug}
                href={`/miejsca/${place.slug}`}
                className="block overflow-hidden rounded-lg border border-black/[.08] bg-white transition-colors hover:border-black/[.2] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:border-white/[.3]"
              >
                <Image
                  src={place.image}
                  alt={place.imageAlt}
                  width={300}
                  height={200}
                  className={`h-24 w-full object-cover ${
                    place.imagePosition === "top" ? "object-top" : "object-center"
                  }`}
                />
                <p className="p-2 text-sm font-medium text-black dark:text-zinc-50">
                  {place.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
