"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Lista providerów logowania społecznościowego obsługiwanych przez
// Supabase Auth. Każdy wpis renderuje się jako identyczny przycisk i
// wywołuje ten sam signInWithOAuth — jedyna różnica to `id` (nazwa
// providera po stronie Supabase) i wygląd. Żeby dodać Apple, gdy będzie
// konto Apple Developer: dopisać tu kolejny obiekt (ikona + label) i
// włączyć providera "Apple" w Supabase Dashboard -> Authentication ->
// Providers — reszta (ten formularz, /auth/callback) nie wymaga zmian.
const OAUTH_PROVIDERS: {
  id: "google";
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "google",
    label: "Zaloguj przez Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
        />
      </svg>
    ),
  },
];

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Nieprawidłowy email lub hasło.",
    "User already registered": "Konto z tym adresem email już istnieje — zaloguj się.",
    "Password should be at least 6 characters.":
      "Hasło musi mieć co najmniej 6 znaków.",
    "Email not confirmed": "Potwierdź adres email (sprawdź skrzynkę), zanim się zalogujesz.",
  };
  return map[message] ?? message;
}

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleOAuthSignIn(provider: "google") {
    setError(null);
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setError(translateAuthError(error.message));
      setOauthLoading(null);
    }
    // Przy sukcesie przeglądarka jest przekierowywana na stronę logowania
    // Google, więc nic więcej tu się nie dzieje.
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (error) {
        setError(translateAuthError(error.message));
        return;
      }
      router.push(redirectTo);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    setSubmitting(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    // Jeśli w projekcie Supabase włączone jest potwierdzanie emaila
    // (domyślne ustawienie), signUp nie zwraca od razu aktywnej sesji —
    // użytkownik musi kliknąć link w mailu, zanim będzie faktycznie
    // zalogowany.
    if (!data.session) {
      setInfo("Konto utworzone! Sprawdź skrzynkę email i potwierdź adres, żeby się zalogować.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-3">
        {OAUTH_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleOAuthSignIn(provider.id)}
            disabled={oauthLoading !== null}
            className="flex items-center justify-center gap-3 rounded-full border border-black/[.08] bg-white px-5 py-3 text-sm font-medium text-black hover:border-wine/50 disabled:opacity-60 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-wine/50"
          >
            {provider.icon}
            {oauthLoading === provider.id ? "Łączenie..." : provider.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600">
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
        lub
        <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Hasło</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white hover:bg-wine-solid-hover disabled:opacity-60"
        >
          {submitting
            ? "Chwileczkę..."
            : mode === "login"
              ? "Zaloguj się"
              : "Zarejestruj się"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
          setInfo(null);
        }}
        className="text-center text-sm text-zinc-500 hover:text-wine dark:text-zinc-400 dark:hover:text-wine"
      >
        {mode === "login"
          ? "Nie masz konta? Zarejestruj się"
          : "Masz już konto? Zaloguj się"}
      </button>
    </div>
  );
}
