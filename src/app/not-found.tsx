import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Nie znaleziono strony
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Nie mogliśmy znaleźć strony, której szukasz. Mogła zostać
          przeniesiona lub usunięta.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-wine-solid px-5 py-2 text-sm font-medium text-white hover:bg-wine-solid-hover"
        >
          Wróć na stronę główną
        </Link>
      </main>
    </div>
  );
}
