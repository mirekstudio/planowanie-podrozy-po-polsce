"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref,
  label,
}: {
  fallbackHref: string;
  label: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // history.length > 1 zazwyczaj oznacza, że jest dokąd wrócić w tej
        // karcie (np. z listy miejsc z filtrami albo z trasy w planerze) —
        // wtedy router.back() przywraca dokładnie ten poprzedni URL (razem
        // z filtrami) oraz scroll. Gdy stronę otwarto bezpośrednio (np.
        // wklejony link), nie ma czego cofać — używamy fallbacku.
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-wine active:text-wine dark:text-zinc-400 dark:hover:text-wine dark:active:text-wine"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
