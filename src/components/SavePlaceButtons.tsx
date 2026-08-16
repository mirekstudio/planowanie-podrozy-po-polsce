"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  addFavorite,
  removeFavorite,
  addVisited,
  removeVisited,
  type SavePlaceInput,
} from "@/app/actions/userPlaces";

function ToggleButton({
  active,
  pending,
  onClick,
  activeLabel,
  inactiveLabel,
  icon,
}: {
  active: boolean;
  pending: boolean;
  onClick: () => void;
  activeLabel: string;
  inactiveLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
        active
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-black/[.08] text-black hover:border-black/[.2] dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-white/[.3]"
      }`}
    >
      {icon}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

export default function SavePlaceButtons({
  place,
  initialFavorite,
  initialVisited,
}: {
  place: SavePlaceInput;
  initialFavorite: boolean;
  initialVisited: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isVisited, setIsVisited] = useState(initialVisited);
  const [pending, startTransition] = useTransition();

  function goToLogin() {
    router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  function toggleFavorite() {
    if (!user && !loading) return goToLogin();
    const next = !isFavorite;
    setIsFavorite(next);
    startTransition(async () => {
      try {
        if (next) await addFavorite(place);
        else await removeFavorite(place.slug);
      } catch {
        setIsFavorite(!next);
      }
    });
  }

  function toggleVisited() {
    if (!user && !loading) return goToLogin();
    const next = !isVisited;
    setIsVisited(next);
    startTransition(async () => {
      try {
        if (next) await addVisited(place);
        else await removeVisited(place.slug);
      } catch {
        setIsVisited(!next);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <ToggleButton
        active={isFavorite}
        pending={pending}
        onClick={toggleFavorite}
        activeLabel="W ulubionych"
        inactiveLabel="Dodaj do ulubionych"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 20s-7-4.35-9.5-8.5C.5 8 2 4.5 5.5 4.5c2.1 0 3.5 1.2 4.2 2.3.1.2.2.3.3.5.1-.2.2-.3.3-.5.7-1.1 2.1-2.3 4.2-2.3 3.5 0 5 3.5 3 7C19 15.65 12 20 12 20Z" />
          </svg>
        }
      />
      <ToggleButton
        active={isVisited}
        pending={pending}
        onClick={toggleVisited}
        activeLabel="Odwiedzone"
        inactiveLabel="Oznacz jako odwiedzone"
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.5 2.5L16 9.5" />
          </svg>
        }
      />
    </div>
  );
}
