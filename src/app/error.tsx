"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Coś poszło nie tak
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Wystąpił nieoczekiwany błąd. Spróbuj ponownie.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-wine-solid px-5 py-2 text-sm font-medium text-white hover:bg-wine-solid-hover"
        >
          Spróbuj ponownie
        </button>
      </main>
    </div>
  );
}
