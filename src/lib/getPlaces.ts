import { supabase } from "@/lib/supabaseClient";
import type { Place } from "@/data/places";

type PlaceRow = {
  slug: string;
  title: string;
  region: string;
  description: string;
  long_description: string;
  lat: number;
  lng: number;
  image: string;
  image_alt: string;
  image_position: "center" | "top" | null;
  credit_author: string;
  credit_license: string;
  sort_order: number;
  tags: string[];
};

function mapRow(row: PlaceRow): Place {
  return {
    slug: row.slug,
    title: row.title,
    region: row.region,
    description: row.description,
    longDescription: row.long_description,
    lat: row.lat,
    lng: row.lng,
    image: row.image,
    imageAlt: row.image_alt,
    imagePosition: row.image_position ?? undefined,
    credit: {
      author: row.credit_author,
      license: row.credit_license,
    },
    sortOrder: row.sort_order,
    tags: row.tags ?? [],
    source: "curated",
  };
}

export async function getPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Nie udało się pobrać miejsc z Supabase: ${error.message}`);
  }

  return (data as PlaceRow[]).map(mapRow);
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się pobrać miejsca z Supabase: ${error.message}`);
  }

  return data ? mapRow(data as PlaceRow) : null;
}
