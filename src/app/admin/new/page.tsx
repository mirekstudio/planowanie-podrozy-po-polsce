import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { createPlace } from "@/app/admin/actions";
import PlaceForm from "@/components/admin/PlaceForm";

export default async function NewPlacePage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/admin"
          className="text-sm text-zinc-600 transition-colors hover:text-wine active:text-wine dark:text-zinc-400 dark:hover:text-wine dark:active:text-wine"
        >
          ← Powrót do panelu
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Nowe miejsce
        </h1>

        <PlaceForm action={createPlace} />
      </main>
    </div>
  );
}
