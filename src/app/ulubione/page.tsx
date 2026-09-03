import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFavorites } from "@/lib/userPlaces";
import SavedPlacesList from "@/components/SavedPlacesList";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function UlubionePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/ulubione");
  }

  const places = await getFavorites();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/" label="Wstecz" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Ulubione
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Miejsca, które oznaczyłeś jako ulubione.
        </p>

        <SavedPlacesList type="favorite" items={places} />
      </main>
    </div>
  );
}
