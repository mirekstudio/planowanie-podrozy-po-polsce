"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SavePlaceInput = {
  slug: string;
  title: string;
  image: string | null;
  imageAlt: string | null;
  source: string;
};

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

async function addToTable(table: "favorites" | "visited", place: SavePlaceInput) {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from(table).upsert({
    user_id: userId,
    place_slug: place.slug,
    place_title: place.title,
    place_image: place.image,
    place_image_alt: place.imageAlt,
    place_source: place.source,
  });

  if (error) {
    throw new Error(`Nie udało się zapisać (${table}): ${error.message}`);
  }
}

async function removeFromTable(table: "favorites" | "visited", slug: string) {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId)
    .eq("place_slug", slug);

  if (error) {
    throw new Error(`Nie udało się usunąć (${table}): ${error.message}`);
  }
}

export async function addFavorite(place: SavePlaceInput) {
  await addToTable("favorites", place);
}

export async function removeFavorite(slug: string) {
  await removeFromTable("favorites", slug);
}

export async function addVisited(place: SavePlaceInput) {
  await addToTable("visited", place);
}

export async function removeVisited(slug: string) {
  await removeFromTable("visited", slug);
}
