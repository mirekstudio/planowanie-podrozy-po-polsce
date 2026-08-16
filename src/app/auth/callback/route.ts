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
  }

  return NextResponse.redirect(
    `${origin}/login?error=1&redirect=${encodeURIComponent(redirectTo)}`,
  );
}
