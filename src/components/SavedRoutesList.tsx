"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { SavedRoute } from "@/lib/savedRoutes";
import { deleteSavedRoute } from "@/app/actions/savedRoutes";

function routeHref(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `/planer/wynik?${search.toString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SavedRoutesList({ items }: { items: SavedRoute[] }) {
  const [routes, setRoutes] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemove(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await deleteSavedRoute(id);
        setRoutes((prev) => prev.filter((r) => r.id !== id));
      } finally {
        setPendingId(null);
      }
    });
  }

  if (routes.length === 0) {
    return (
      <p className="mt-10 text-zinc-500 dark:text-zinc-500">
        Nie masz jeszcze żadnych zapisanych tras. Wygeneruj trasę w
        „Zaplanuj podróż”, wybierz wariant i kliknij „Zapisz tę trasę”.
      </p>
    );
  }

  return (
    <ul className="mt-10 flex flex-col gap-3">
      {routes.map((route) => (
        <li
          key={route.id}
          className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-4 transition-colors hover:border-wine/50 dark:border-white/[.145] dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-medium text-black dark:text-zinc-50">
              {route.label}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Zapisano {formatDate(route.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={routeHref(route.params)}
              className="rounded-full bg-wine-solid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover"
            >
              Otwórz
            </Link>
            <button
              type="button"
              onClick={() => handleRemove(route.id)}
              disabled={pendingId === route.id}
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-red-500/50 hover:text-red-600 active:border-red-500 active:bg-red-500/5 disabled:opacity-60 dark:border-white/[.145] dark:text-zinc-300 dark:hover:border-red-500/50 dark:hover:text-red-400"
            >
              {pendingId === route.id ? "..." : "Usuń"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
