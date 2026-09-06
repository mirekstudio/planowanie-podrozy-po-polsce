"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { endActiveTrip } from "@/app/actions/activeTrip";

// Zgłoszenie 06.09 (nie proszone wprost, ale konieczne dla podstawowej
// higieny funkcji): jedyny sposób na zakończenie aktywnej podróży poza tym
// przyciskiem byłaby ręczna edycja bazy danych — bez niego pozycja menu
// "Dziś w [baza]" zostałaby aktywna bezterminowo, nawet długo po
// faktycznym powrocie z wyjazdu.
export default function EndActiveTripButton() {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnd() {
    if (!window.confirm("Zakończyć tę aktywną podróż?")) return;
    setEnding(true);
    setError(null);
    try {
      await endActiveTrip();
      router.push("/planer");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zakończyć podróży.");
      setEnding(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col items-start gap-2 border-t border-black/[.08] pt-6 dark:border-white/[.145]">
      <button
        type="button"
        onClick={handleEnd}
        disabled={ending}
        className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-wine/50 active:border-wine active:bg-wine/5 disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-300 dark:hover:border-wine/50 dark:active:bg-wine/10"
      >
        {ending ? "Kończenie…" : "Zakończ tę podróż"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
