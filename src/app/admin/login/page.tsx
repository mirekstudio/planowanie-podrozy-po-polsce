import { login } from "@/app/admin/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Panel admina
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Podaj hasło, żeby zarządzać miejscami.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            Nieprawidłowe hasło.
          </p>
        )}

        <form action={login} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            name="password"
            placeholder="Hasło"
            required
            autoFocus
            className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Zaloguj
          </button>
        </form>
      </main>
    </div>
  );
}
