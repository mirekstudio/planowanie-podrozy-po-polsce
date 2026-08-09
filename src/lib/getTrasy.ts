import { supabase } from "@/lib/supabaseClient";
import type { Trasa } from "@/data/trasy";

type TrasaRow = {
  id: number;
  nazwa: string;
  kategoria: string;
  dlugosc_km: number;
  przebieg: string;
  opis: string;
};

function mapRow(row: TrasaRow): Trasa {
  return {
    id: row.id,
    nazwa: row.nazwa,
    kategoria: row.kategoria,
    dlugoscKm: row.dlugosc_km,
    przebieg: row.przebieg,
    opis: row.opis,
  };
}

export async function getTrasy(): Promise<Trasa[]> {
  const { data, error } = await supabase
    .from("trasy")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Nie udało się pobrać tras z Supabase: ${error.message}`);
  }

  return (data as TrasaRow[]).map(mapRow);
}
