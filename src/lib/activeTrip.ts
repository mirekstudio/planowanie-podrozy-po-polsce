import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActiveTrip = {
  baseSlug: string;
  baseTitle: string;
  baseLat: number;
  baseLng: number;
  region: string;
  startDate: string;
  days: number;
  createdAt: string;
};

type ActiveTripRow = {
  base_slug: string;
  base_title: string;
  base_lat: number;
  base_lng: number;
  region: string;
  start_date: string;
  days: number;
  created_at: string;
};

function mapRow(row: ActiveTripRow): ActiveTrip {
  return {
    baseSlug: row.base_slug,
    baseTitle: row.base_title,
    baseLat: row.base_lat,
    baseLng: row.base_lng,
    region: row.region,
    startDate: row.start_date,
    days: row.days,
    createdAt: row.created_at,
  };
}

// RLS na active_trips (patrz supabase/add_active_trips.sql) i tak dopuszcza
// tylko wiersz zalogowanego użytkownika — "user_id" jest tam kluczem
// głównym, więc na użytkownika przypada co najwyżej JEDEN wiersz. Jawne
// sprawdzenie usera tutaj pozwala zwrócić null zamiast pytać Supabase bez
// sensu, gdy nikt nie jest zalogowany — ten sam wzorzec co
// getSavedRoutes/getFavorites w savedRoutes.ts/userPlaces.ts.
export async function getActiveTrip(): Promise<ActiveTrip | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("active_trips")
    .select("base_slug, base_title, base_lat, base_lng, region, start_date, days, created_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się pobrać aktywnej podróży: ${error.message}`);
  }

  return data ? mapRow(data as ActiveTripRow) : null;
}
