import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { getPlaceBySlug } from "@/lib/getPlaces";
import { updatePlace } from "@/app/admin/actions";
import PlaceForm from "@/components/admin/PlaceForm";

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/admin"
          className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Powrót do panelu
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Edytuj: {place.title}
        </h1>

        <PlaceForm place={place} action={updatePlace.bind(null, place.slug)} />
      </main>
    </div>
  );
}
