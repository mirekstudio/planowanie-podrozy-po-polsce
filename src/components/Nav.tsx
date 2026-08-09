import Link from "next/link";

const links = [
  { href: "/", label: "Start" },
  { href: "/miejsca", label: "Miejsca" },
  { href: "/szlaki", label: "Szlaki" },
  { href: "/mapa", label: "Mapa" },
  { href: "/trasa", label: "Trasa" },
  { href: "/planer", label: "Planer" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  return (
    <nav className="border-b border-black/[.08] bg-white dark:border-white/[.145] dark:bg-black">
      <div className="mx-auto flex max-w-3xl gap-6 px-6 py-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
