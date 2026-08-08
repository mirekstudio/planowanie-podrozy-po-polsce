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
        className="text-sm text-red-600 hover:underline dark:text-red-400"
      >
        Usuń
      </button>
    </form>
  );
}
