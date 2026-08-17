import { supabase } from "@/lib/supabaseClient";
import type { Nocleg } from "@/data/noclegi";

type NoclegRow = {
  id: string;
  nazwa: string;
  typ: string;
  lat: number;
  lng: number;
  miejsce_powiazane: string | null;
  udogodnienia: string | null;
  poziom_komfortu: string | null;
};

function mapRow(row: NoclegRow): Nocleg {
  return {
    id: row.id,
    nazwa: row.nazwa,
    typ: row.typ as Nocleg["typ"],
    lat: row.lat,
    lng: row.lng,
    miejscePowiazane: row.miejsce_powiazane,
    udogodnienia: row.udogodnienia,
    poziomKomfortu: row.poziom_komfortu as Nocleg["poziomKomfortu"],
  };
}

// Tabela "noclegi" nie musi istnieć jeszcze u każdego, kto uruchamia ten
// kod (patrz supabase/add_noclegi.sql) — zamiast wywalać całą stronę
// wyniku planera błędem, po prostu nie proponujemy noclegów, dokładnie
// tak jak wtedy, gdyby tabela istniała, ale była pusta.
export async function getNoclegi(): Promise<Nocleg[]> {
  const { data, error } = await supabase.from("noclegi").select("*");

  if (error) {
    console.error("Nie udało się pobrać noclegów z Supabase:", error.message);
    return [];
  }

  return (data as NoclegRow[]).map(mapRow);
}
