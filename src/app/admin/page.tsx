import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { getPlaces } from "@/lib/getPlaces";
import { logout, deletePlace } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const places = await getPlaces();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Panel admina — miejsca
          </h1>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-zinc-500 hover:text-wine dark:text-zinc-400 dark:hover:text-wine"
            >
              Wyloguj
            </button>
          </form>
        </div>

        <Link
          href="/admin/new"
          className="mt-6 inline-block rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white hover:bg-wine-solid-hover"
        >
          + Dodaj nowe miejsce
        </Link>

        <ul className="mt-8 divide-y divide-black/[.08] rounded-xl border border-black/[.08] bg-white dark:divide-white/[.145] dark:border-white/[.145] dark:bg-zinc-900">
          {places.map((place) => (
            <li
              key={place.slug}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-medium text-black dark:text-zinc-50">
                  {place.title}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  /{place.slug}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/${place.slug}/edit`}
                  className="text-sm text-zinc-600 hover:text-wine dark:text-zinc-400 dark:hover:text-wine"
                >
                  Edytuj
                </Link>
                <DeleteButton
                  action={deletePlace.bind(null, place.slug)}
                  label={place.title}
                />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
