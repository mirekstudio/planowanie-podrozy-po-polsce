import { getTrasy } from "@/lib/getTrasy";
import type { Trasa } from "@/data/trasy";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = [
  "Nadmorskie",
  "Historyczno-zamkowe",
  "Górskie",
  "Pojezierza i natura",
];

function skrocPrzebieg(przebieg: string): string {
  const miejscowosci = przebieg.split(" – ").map((s) => s.trim());
  if (miejscowosci.length > 1) {
    return `${miejscowosci[0]} → ${miejscowosci[miejscowosci.length - 1]}`;
  }
  return przebieg;
}

function groupByCategory(trasy: Trasa[]): [string, Trasa[]][] {
  const map = new Map<string, Trasa[]>();
  for (const trasa of trasy) {
    const list = map.get(trasa.kategoria) ?? [];
    list.push(trasa);
    map.set(trasa.kategoria, list);
  }

  const orderedKeys = [
    ...CATEGORY_ORDER.filter((key) => map.has(key)),
    ...[...map.keys()].filter((key) => !CATEGORY_ORDER.includes(key)).sort(),
  ];

  return orderedKeys.map((key) => [key, map.get(key)!]);
}

export default async function SzlakiPage() {
  const trasy = await getTrasy();
  const groups = groupByCategory(trasy);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <BackButton fallbackHref="/" label="Wstecz" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Popularne szlaki samochodowe w Polsce
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Wielodniowe trasy po całej Polsce, pogrupowane tematycznie.
        </p>

        {groups.map(([kategoria, items]) => (
          <section key={kategoria} className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
              {kategoria}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {items.map((trasa) => (
                <div
                  key={trasa.id}
                  className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-medium text-black dark:text-zinc-50">
                      {trasa.nazwa}
                    </h3>
                    <span className="shrink-0 rounded-full border border-black/[.08] px-2.5 py-0.5 text-xs text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
                      {trasa.dlugoscKm} km
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                    {skrocPrzebieg(trasa.przebieg)}
                  </p>
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {trasa.opis}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
