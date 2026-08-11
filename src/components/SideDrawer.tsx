"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Category = {
  label: string;
  tag: string | null;
  icon: React.ReactNode;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5 shrink-0",
};

const CATEGORIES: Category[] = [
  {
    label: "Historia",
    tag: "Historia",
    icon: (
      <svg {...iconProps}>
        <path d="M3 21h18M4 21V10M8 21V10M12 21V10M16 21V10M20 21V10M2 10l10-6 10 6" />
      </svg>
    ),
  },
  {
    label: "Natura",
    tag: "Natura",
    icon: (
      <svg {...iconProps}>
        <path d="M12 21C7 21 3 17 3 12S7 3 12 3c1 4 4 6 8 6 0 6.5-4 12-8 12Z" />
      </svg>
    ),
  },
  {
    label: "Zamki i Pałace",
    tag: null,
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="11" width="16" height="10" />
        <path d="M5 11V7h2v4M11 11V7h2v4M17 11V7h2v4" />
      </svg>
    ),
  },
  {
    label: "Parki Narodowe",
    tag: null,
    icon: (
      <svg {...iconProps}>
        <path d="M3 20 9 8l4 6 2-3 6 9" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
  {
    label: "Jeziora",
    tag: null,
    icon: (
      <svg {...iconProps}>
        <path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        <path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      </svg>
    ),
  },
  {
    label: "Aktywność fizyczna",
    tag: "Aktywność fizyczna",
    icon: (
      <svg {...iconProps} strokeLinejoin="round">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
    ),
  },
  {
    label: "Architektura sakralna",
    tag: null,
    icon: (
      <svg {...iconProps}>
        <path d="M6 21v-9M18 21v-9M6 12 12 7l6 5M6 21h12M12 7V3M10.5 4.5h3" />
      </svg>
    ),
  },
];

function categoryHref(tag: string | null) {
  return tag ? `/miejsca?kategoria=${encodeURIComponent(tag)}` : "/miejsca";
}

function DrawerLink({
  href,
  icon,
  label,
  onClick,
  bold,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  bold?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10 ${
        bold
          ? "font-semibold text-black dark:text-zinc-50"
          : "text-zinc-700 dark:text-zinc-300"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function FeaturedLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3.5 text-[15px] font-semibold text-black hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function DrawerStat({
  icon,
  label,
  count,
  disabledNote,
  onDisabledClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  disabledNote?: string;
  onDisabledClick?: () => void;
}) {
  if (disabledNote) {
    return (
      <button
        type="button"
        onClick={onDisabledClick}
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-zinc-400 dark:text-zinc-600"
      >
        <span className="flex items-center gap-3">
          {icon}
          <span className="flex flex-col items-start">
            <span>{label}</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {disabledNote}
            </span>
          </span>
        </span>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-zinc-400 dark:bg-white/10 dark:text-zinc-600">
          {count}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-3 text-sm text-zinc-700 dark:text-zinc-300">
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
        {count}
      </span>
    </div>
  );
}

export default function SideDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  function showComingSoonNotice() {
    setNotice("Ta funkcja pojawi się wkrótce – wymaga założenia konta.");
  }

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-xl transition-transform duration-300 dark:bg-zinc-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between bg-black px-5 py-6 text-white">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
              </svg>
            </div>
            <span className="text-sm font-semibold leading-snug">
              Planowanie podróży
              <br />
              po Polsce
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij menu"
            className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex flex-col gap-2 pb-1">
            <FeaturedLink
              href="/polska-w-pigulce"
              onClick={onClose}
              label="Polska w pigułce"
              icon={
                <svg {...iconProps}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8h.01M11 11h1v6h1" />
                </svg>
              }
            />
            <FeaturedLink
              href="/planer"
              onClick={onClose}
              label="Zaplanuj podróż"
              icon={
                <svg {...iconProps}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M15 9l-2 5-5 2 2-5 5-2Z" strokeLinejoin="round" />
                </svg>
              }
            />
            <FeaturedLink
              href="/mapa"
              onClick={onClose}
              label="Mapa"
              icon={
                <svg {...iconProps}>
                  <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
                  <path d="M9 4v14M15 6v14" />
                </svg>
              }
            />
            <FeaturedLink
              href="/trasa"
              onClick={onClose}
              label="Trasa"
              icon={
                <svg {...iconProps}>
                  <path d="M8 6h13M8 12h13M8 18h13" />
                  <circle cx="4" cy="6" r="1" fill="currentColor" />
                  <circle cx="4" cy="12" r="1" fill="currentColor" />
                  <circle cx="4" cy="18" r="1" fill="currentColor" />
                </svg>
              }
            />
          </div>

          <hr className="my-2 border-black/[.08] dark:border-white/[.145]" />

          <DrawerLink
            href="/miejsca"
            onClick={onClose}
            bold
            label="Wszystkie miejsca"
          />

          <DrawerStat
            count={0}
            label="Ulubione"
            disabledNote="Wymaga konta"
            onDisabledClick={showComingSoonNotice}
            icon={
              <svg {...iconProps}>
                <path d="M12 20s-7-4.35-9.5-8.5C.5 8 2 4.5 5.5 4.5c2.1 0 3.5 1.2 4.2 2.3.1.2.2.3.3.5.1-.2.2-.3.3-.5.7-1.1 2.1-2.3 4.2-2.3 3.5 0 5 3.5 3 7C19 15.65 12 20 12 20Z" />
              </svg>
            }
          />
          <DrawerStat
            count={0}
            label="Odwiedzone"
            disabledNote="Wymaga konta"
            onDisabledClick={showComingSoonNotice}
            icon={
              <svg {...iconProps}>
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12.5l2.5 2.5L16 9.5" />
              </svg>
            }
          />

          <hr className="my-2 border-black/[.08] dark:border-white/[.145]" />

          {CATEGORIES.map((category) => (
            <DrawerLink
              key={category.label}
              href={categoryHref(category.tag)}
              onClick={onClose}
              icon={category.icon}
              label={category.label}
            />
          ))}

          <hr className="my-2 border-black/[.08] dark:border-white/[.145]" />

          <DrawerLink
            href="/szlaki"
            onClick={onClose}
            label="Szlaki samochodowe"
            icon={
              <svg {...iconProps}>
                <path d="M8 21 11 3h2l3 18" />
                <path d="M12 8v2M12 13v2M12 18v1" />
              </svg>
            }
          />

          <hr className="my-2 border-black/[.08] dark:border-white/[.145]" />

          <p className="px-3 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Więcej
          </p>
          <DrawerLink
            href="/admin"
            onClick={onClose}
            label="Admin"
            icon={
              <svg {...iconProps}>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 1 1 8 0v4" />
              </svg>
            }
          />
        </nav>

        <div
          className={`pointer-events-none sticky bottom-0 px-3 pb-3 transition-opacity duration-200 ${
            notice ? "opacity-100" : "opacity-0"
          }`}
          aria-live="polite"
        >
          {notice && (
            <p className="rounded-lg bg-black px-3 py-2.5 text-xs text-white shadow-lg dark:bg-white dark:text-black">
              {notice}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
