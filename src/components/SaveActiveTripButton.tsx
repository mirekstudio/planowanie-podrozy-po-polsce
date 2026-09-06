"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { saveActiveTrip, type SaveActiveTripInput } from "@/app/actions/activeTrip";

// Zgłoszenie 06.09: w przeciwieństwie do SaveRouteButton (który dla
// niezalogowanych pokazuje link do logowania — "Trasa objazdowa" to jedna,
// konkretna trasa, warto zachęcić do zapisania) — tu, zgodnie z wprost
// podanym wymogiem, przycisk pokazuje się WYŁĄCZNIE zalogowanym. Dla
// niezalogowanych i dla stanu "jeszcze sprawdzamy sesję" (loading)
// komponent nic nie renderuje.
export default function SaveActiveTripButton({ trip }: { trip: SaveActiveTripInput }) {
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !user) return null;

  if (saved) {
    return (
      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-600/10 px-5 py-3 text-sm font-medium text-green-700 dark:text-green-400">
        ✓ Zapisano jako aktywna podróż —{" "}
        <Link href="/dzis" className="underline">
          zobacz „Dziś w {trip.baseTitle}”
        </Link>
      </p>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveActiveTrip(trip);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się zapisać aktywnej podróży.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover disabled:opacity-60"
      >
        {saving ? "Zapisywanie…" : "To moja podróż — zapisz"}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
