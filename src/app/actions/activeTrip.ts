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

export type SaveActiveTripInput = {
  baseSlug: string;
  baseTitle: string;
  baseLat: number;
  baseLng: number;
  region: string;
  days: number;
};

// Upsert po user_id (klucz główny active_trips, patrz
// supabase/add_active_trips.sql) — zapisanie nowej bazy jako aktywnej
// podróży CELOWO zastępuje poprzednią, jedna osoba ma naraz co najwyżej
// jedną aktywną podróż. start_date ustawiamy tu jawnie na "dziś" (zamiast
// polegać na domyślnej wartości kolumny), żeby zapisanie NOWEJ podróży na
// miejsce starej też liczyło datę rozpoczęcia od nowa.
export async function saveActiveTrip(input: SaveActiveTripInput) {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("active_trips").upsert(
    {
      user_id: userId,
      base_slug: input.baseSlug,
      base_title: input.baseTitle,
      base_lat: input.baseLat,
      base_lng: input.baseLng,
      region: input.region,
      days: input.days,
      start_date: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Nie udało się zapisać aktywnej podróży: ${error.message}`);
  }
}

// Zgłoszenie 06.09: nie było wprost proszone, ale bez tego użytkownik nie
// miałby ŻADNEGO sposobu na zakończenie aktywnej podróży poza bezpośrednią
// edycją bazy danych — pozycja menu "Dziś w [baza]" zostałaby aktywna
// bezterminowo. Minimalna, ale konieczna klamra do tej funkcji.
export async function endActiveTrip() {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("active_trips")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Nie udało się zakończyć podróży: ${error.message}`);
  }
}
