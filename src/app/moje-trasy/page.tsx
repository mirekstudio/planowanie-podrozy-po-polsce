import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSavedRoutes } from "@/lib/savedRoutes";
import SavedRoutesList from "@/components/SavedRoutesList";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function MojeTrasyPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/moje-trasy");
  }

  const routes = await getSavedRoutes();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/" label="Wstecz" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Moje trasy
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Trasy, które zapisałeś — otwórz je od razu, bez wypełniania
          formularza od nowa.
        </p>

        <SavedRoutesList items={routes} />
      </main>
    </div>
  );
}
