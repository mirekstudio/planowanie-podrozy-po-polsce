import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Tu Supabase przekierowuje po zalogowaniu przez OAuth (Google, a w
// przyszłości Apple — ten route handler nie zależy od konkretnego
// providera) oraz po kliknięciu linku potwierdzającego adres email.
// Zamienia jednorazowy `code` na prawdziwą sesję i zapisuje ją w cookies.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");
  const redirectTo =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
    // Przekazujemy prawdziwą treść błędu (np. "Email not confirmed"), a nie
    // tylko flagę — /login przepuszcza ją przez translateAuthError, więc
    // użytkownik widzi ten sam czytelny, przetłumaczony komunikat co przy
    // logowaniu email/hasłem, zamiast cichego powrotu do ekranu logowania.
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}&redirect=${encodeURIComponent(redirectTo)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Nie udało się dokończyć logowania. Spróbuj ponownie.")}&redirect=${encodeURIComponent(redirectTo)}`,
  );
}
