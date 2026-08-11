"use client";

export default function LocationPermissionModal({
  onAllow,
  onDismiss,
}: {
  onAllow: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-black/[.08] bg-white p-6 text-center dark:border-white/[.145] dark:bg-zinc-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-black dark:bg-white/10 dark:text-zinc-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
        </div>

        <h2
          id="location-modal-title"
          className="mt-4 text-lg font-semibold text-black dark:text-zinc-50"
        >
          Czy możemy użyć Twojej lokalizacji?
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Pomożemy Ci zaplanować podróż od miejsca, w którym teraz jesteś.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAllow}
            className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Zezwól
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium text-black hover:border-black/[.2] dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-white/[.3]"
          >
            Nie teraz
          </button>
        </div>
      </div>
    </div>
  );
}
