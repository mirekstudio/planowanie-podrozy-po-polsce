import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SavedPlace = {
  slug: string;
  title: string;
  image: string | null;
  imageAlt: string | null;
  source: string;
  createdAt: string;
};

type SavedPlaceRow = {
  place_slug: string;
  place_title: string;
  place_image: string | null;
  place_image_alt: string | null;
  place_source: string;
  created_at: string;
};

function mapRow(row: SavedPlaceRow): SavedPlace {
  return {
    slug: row.place_slug,
    title: row.place_title,
    image: row.place_image,
    imageAlt: row.place_image_alt,
    source: row.place_source,
    createdAt: row.created_at,
  };
}

// RLS na tabelach favorites/visited (patrz supabase/add_favorites_and_visited.sql)
// i tak dopuszcza tylko wiersze zalogowanego użytkownika, ale jawne
// sprawdzenie usera tutaj pozwala zwrócić pustą listę zamiast pytać
// Supabase bez sensu, gdy nikt nie jest zalogowany.
async function getSavedPlaces(table: "favorites" | "visited"): Promise<SavedPlace[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(table)
    .select("place_slug, place_title, place_image, place_image_alt, place_source, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Nie udało się pobrać listy (${table}): ${error.message}`);
  }

  return (data as SavedPlaceRow[]).map(mapRow);
}

export function getFavorites(): Promise<SavedPlace[]> {
  return getSavedPlaces("favorites");
}

export function getVisited(): Promise<SavedPlace[]> {
  return getSavedPlaces("visited");
}

// Do stanu początkowego przycisków na stronie szczegółów miejsca — jedno
// zapytanie po oba stany zamiast dwóch osobnych round-tripów do Supabase.
export async function getPlaceSaveStatus(
  slug: string,
): Promise<{ isFavorite: boolean; isVisited: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isFavorite: false, isVisited: false };

  const [favoriteResult, visitedResult] = await Promise.all([
    supabase.from("favorites").select("place_slug").eq("place_slug", slug).maybeSingle(),
    supabase.from("visited").select("place_slug").eq("place_slug", slug).maybeSingle(),
  ]);

  return {
    isFavorite: Boolean(favoriteResult.data),
    isVisited: Boolean(visitedResult.data),
  };
}
