import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Odpowiednik middleware.ts w Next.js 16 (ta nazwa/konwencja jest tu
// przestarzała, patrz node_modules/next/dist/docs .../proxy.md) —
// uruchamiany przed każdym requestem. Odświeża token sesji Supabase i
// zapisuje nowe cookies w odpowiedzi. Bez tego Server Components (które
// mogą tylko CZYTAĆ cookies, nie zapisywać) prędzej czy później zobaczyłyby
// wygasłą sesję, mimo że użytkownik jest wciąż zalogowany.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Samo wywołanie odświeża token, jeśli trzeba — wynik nie jest tu
  // potrzebny, bo strony i tak same sprawdzają usera przez
  // createSupabaseServerClient().
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Pomijamy pliki statyczne i obrazy — proxy uruchamiany na nich tylko
    // marnowałby czas, sesja i tak nie jest im do niczego potrzebna.
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
