import { createBrowserClient } from "@supabase/ssr";

// Klient używany w komponentach klienckich ("use client"). createBrowserClient
// (w odróżnieniu od zwykłego createClient) zapisuje sesję w cookies, a nie
// tylko w localStorage — dzięki temu serwer (Server Components, proxy.ts,
// Route Handlery) widzi tego samego zalogowanego użytkownika co przeglądarka.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
