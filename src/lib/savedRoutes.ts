import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SavedRoute = {
  id: string;
  label: string;
  // Dokładne parametry /planer/wynik (włącznie z "variant") — otwarcie
  // zapisanej trasy to nawigacja pod te same parametry, patrz
  // supabase/add_saved_routes.sql.
  params: Record<string, string>;
  createdAt: string;
};

type SavedRouteRow = {
  id: string;
  label: string;
  params: Record<string, string>;
  created_at: string;
};

// RLS na saved_routes (patrz supabase/add_saved_routes.sql) i tak dopuszcza
// tylko wiersze zalogowanego użytkownika, ale jawne sprawdzenie usera tutaj
// pozwala zwrócić pustą listę zamiast pytać Supabase bez sensu, gdy nikt
// nie jest zalogowany — ten sam wzorzec co getFavorites/getVisited w
// userPlaces.ts.
export async function getSavedRoutes(): Promise<SavedRoute[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_routes")
    .select("id, label, params, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Nie udało się pobrać zapisanych tras: ${error.message}`);
  }

  return (data as SavedRouteRow[]).map((row) => ({
    id: row.id,
    label: row.label,
    params: row.params,
    createdAt: row.created_at,
  }));
}
