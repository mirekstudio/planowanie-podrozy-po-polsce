import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaceBySlug } from "@/lib/getPlaces";

export const dynamic = "force-dynamic";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Powrót do listy miejsc
        </Link>

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

        <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {place.longDescription}
        </p>

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-500">
          Współrzędne: {place.lat}, {place.lng}
        </p>
      </main>
    </div>
  );
}
