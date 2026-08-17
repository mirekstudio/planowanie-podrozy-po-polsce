"use server";

import { redirect } from "next/navigation";
import {
  createAdminSession,
  clearAdminSession,
  isValidPassword,
} from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!isValidPassword(password)) {
    redirect("/admin/login?error=1");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logout() {
  await clearAdminSession();
  redirect("/admin/login");
}

function readPlaceForm(formData: FormData) {
  const imagePosition = String(formData.get("imagePosition") ?? "");
  const nearbyAttraction = String(formData.get("nearbyAttraction") ?? "").trim();
  const culinaryTip = String(formData.get("culinaryTip") ?? "").trim();
  // Kempingi wpisywane po jednym na linię w textarea — puste linie
  // odfiltrowane, żeby przypadkowe entery nie zapisywały się jako "".
  const recommendedCampsites = String(formData.get("recommendedCampsites") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    region: String(formData.get("region") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    long_description: String(formData.get("longDescription") ?? "").trim(),
    lat: Number(formData.get("lat")),
    lng: Number(formData.get("lng")),
    image: String(formData.get("image") ?? "").trim(),
    image_alt: String(formData.get("imageAlt") ?? "").trim(),
    image_position: imagePosition === "" ? null : imagePosition,
    credit_author: String(formData.get("creditAuthor") ?? "").trim(),
    credit_license: String(formData.get("creditLicense") ?? "").trim(),
    sort_order: Number(formData.get("sortOrder") ?? 0),
    tags: formData.getAll("tags").map(String),
    typ_regionu: formData.getAll("regionType").map(String),
    otoczenie: formData.getAll("surroundings").map(String),
    blizkosc_atrakcji: nearbyAttraction === "" ? null : nearbyAttraction,
    rekomendowane_kempingi: recommendedCampsites,
    wskazowki_kulinarne: culinaryTip === "" ? null : culinaryTip,
    featured: formData.get("featured") === "on",
  };
}

export async function createPlace(formData: FormData) {
  const values = readPlaceForm(formData);

  const { error } = await supabaseAdmin.from("places").insert(values);
  if (error) {
    throw new Error(`Nie udało się dodać miejsca: ${error.message}`);
  }

  redirect("/admin");
}

export async function updatePlace(originalSlug: string, formData: FormData) {
  const values = readPlaceForm(formData);

  const { error } = await supabaseAdmin
    .from("places")
    .update(values)
    .eq("slug", originalSlug);

  if (error) {
    throw new Error(`Nie udało się zapisać zmian: ${error.message}`);
  }

  redirect("/admin");
}

export async function deletePlace(slug: string) {
  const { error } = await supabaseAdmin.from("places").delete().eq("slug", slug);

  if (error) {
    throw new Error(`Nie udało się usunąć miejsca: ${error.message}`);
  }

  redirect("/admin");
}
