import TrasaForm from "@/components/TrasaForm";
import BackButton from "@/components/BackButton";
import { getPlaces } from "@/lib/getPlaces";

export const dynamic = "force-dynamic";

export default async function TrasaPage() {
  const places = await getPlaces();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/" label="Wstecz" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Planowanie trasy
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Wybierz miejsca, które chcesz odwiedzić, i ustaw kolejność zwiedzania.
        </p>

        <TrasaForm places={places} />
      </main>
    </div>
  );
}
