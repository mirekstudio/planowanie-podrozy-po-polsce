"use client";

import { useState } from "react";

export default function SelectRouteButton() {
  const [selected, setSelected] = useState(false);

  if (selected) {
    return (
      <p className="inline-flex items-center gap-2 self-start rounded-full bg-green-600/10 px-5 py-3 text-sm font-medium text-green-700 dark:text-green-400">
        ✓ Wybrano tę trasę — rozpocznij nawigację przyciskiem poniżej mapy.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setSelected(true)}
      className="self-start rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover"
    >
      Wybierz tę trasę
    </button>
  );
}
