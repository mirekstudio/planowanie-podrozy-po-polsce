"use client";

import Link from "next/link";
import { useState } from "react";
import SideDrawer from "@/components/SideDrawer";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="relative z-10 border-b border-black/[.08] bg-white font-sans dark:border-white/[.145] dark:bg-black">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Otwórz menu"
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <Link
            href="/"
            className="text-sm font-semibold text-black dark:text-zinc-50"
          >
            Planowanie podróży po Polsce
          </Link>
        </div>
      </header>

      <SideDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
