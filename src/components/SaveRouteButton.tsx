"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { saveRoute } from "@/app/actions/savedRoutes";

export default function SaveRouteButton({
  label,
  params,
}: {
  label: string;
  params: Record<string, string>;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zamiast chować przycisk dla niezalogowanych (jak "Wstecz" itp.), pokazujemy
  // link do logowania — to samo miejsce, ten sam kontekst (konkretna trasa),
  // więc lepiej dać znać, że funkcja istnieje, niż milczeć o niej.
  if (!loading && !user) {
    const redirectTo = `${pathname}?${searchParams.toString()}`;
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
        className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-wine/50 active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:text-zinc-300 dark:hover:border-wine/50 dark:active:bg-wine/10"
      >
        Zaloguj się, żeby zapisać trasę
      </Link>
    );
  }

  if (saved) {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-green-600/10 px-5 py-3 text-sm font-medium text-green-700 dark:text-green-400">
        ✓ Zapisano —{" "}
        <Link href="/moje-trasy" className="underline">
          zobacz w „Moje trasy”
        </Link>
      </p>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveRoute(label, params);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się zapisać trasy.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium text-black transition-colors hover:border-wine/50 active:border-wine active:bg-wine/5 disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-wine/50 dark:active:bg-wine/10"
      >
        {saving ? "Zapisywanie…" : "Zapisz tę trasę"}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
