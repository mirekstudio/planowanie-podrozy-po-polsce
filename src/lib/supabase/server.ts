import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Klient dla Server Components, Server Actions i Route Handlerów — czyta i
// (tam, gdzie wolno) zapisuje sesję z/do cookies zamiast localStorage.
// Server Components nie mogą ustawiać cookies (tylko odczytują), więc tam
// `setAll` jest no-opem — faktyczne odświeżanie sesji robi proxy.ts,
// uruchamiane przed każdym requestem.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Wywołane z Server Component (np. podczas renderowania strony) —
            // nie da się tu zapisać cookies. Nieszkodliwe, o ile proxy.ts
            // odświeża sesję dla każdego requestu (patrz src/proxy.ts).
          }
        },
      },
    },
  );
}
