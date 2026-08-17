"use client";

export default function DeleteButton({
  action,
  label,
}: {
  action: () => void;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(`Na pewno usunąć „${label}"? Tej operacji nie można cofnąć.`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg px-3 py-3 text-sm text-red-600 transition-colors hover:underline active:text-red-800 dark:text-red-400 dark:active:text-red-300"
      >
        Usuń
      </button>
    </form>
  );
}
