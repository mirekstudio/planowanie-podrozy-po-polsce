import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import BackLink from "@/components/BackLink";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectParam, error: errorParam } = await searchParams;
  // Tylko ścieżki względne zaczynające się od "/" — bez tego ktoś mógłby
  // podać ?redirect=https://zla-strona.pl i przekierować zalogowanego
  // użytkownika poza appkę (open redirect).
  const redirectTo =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-md px-6 py-16">
        {/* Celowo BackLink (statyczny cel "/"), NIE BackButton z router.back()
            — użytkownik trafia tu często przez automatyczny redirect z
            chronionej strony (/ulubione, /odwiedzone), gdy jest
            niezalogowany. router.back() cofnąłby go właśnie do TEJ strony,
            która natychmiast przekierowałaby z powrotem tutaj — pętla,
            z której "Wstecz" nigdy by nie wyszło. Stały cel omija to
            ryzyko całkowicie, kosztem odrobiny precyzji. */}
        <BackLink href="/" label="Wstecz" />
        <h1 className="mt-4 text-center text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Zaloguj się
        </h1>
        <p className="mt-2 text-center text-zinc-600 dark:text-zinc-400">
          Zaloguj się, żeby zapisywać ulubione i odwiedzone miejsca.
        </p>

        <div className="mt-8">
          <LoginForm redirectTo={redirectTo} initialError={errorParam ?? null} />
        </div>
      </main>
    </div>
  );
}
