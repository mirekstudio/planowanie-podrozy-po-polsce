"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Musisz być zalogowany, żeby to zrobić.");
  }
  return user.id;
}

export async function saveRoute(label: string, params: Record<string, string>) {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("saved_routes").insert({
    user_id: userId,
    label,
    params,
  });

  if (error) {
    throw new Error(`Nie udało się zapisać trasy: ${error.message}`);
  }
}

export async function deleteSavedRoute(id: string) {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("saved_routes")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    throw new Error(`Nie udało się usunąć zapisanej trasy: ${error.message}`);
  }
}
