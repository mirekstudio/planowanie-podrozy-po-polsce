-- Tabela "saved_routes" trzyma trasy zapisane przez zalogowanych
-- użytkowników, żeby mogli wrócić do wcześniej wygenerowanej trasy bez
-- przechodzenia przez cały formularz Planera od nowa. Zapisujemy dokładne
-- parametry URL-a wyniku (/planer/wynik?...) łącznie z wybranym wariantem
-- ("variant") — otwarcie zapisanej trasy to po prostu nawigacja pod te
-- same parametry, trasa odtwarza się tym samym algorytmem co przy
-- pierwszym wygenerowaniu. "label" to czytelny opis do wyświetlenia na
-- liście (np. "3 dni, Historia, Morze — start: Poznań"), żeby nie trzeba
-- było dekodować parametrów, żeby rozpoznać, o którą trasę chodzi.

create table if not exists saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  params jsonb not null,
  created_at timestamptz not null default now()
);

alter table saved_routes enable row level security;

create policy "Users can view their own saved routes"
  on saved_routes for select
  using (auth.uid() = user_id);

create policy "Users can add their own saved routes"
  on saved_routes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own saved routes"
  on saved_routes for delete
  using (auth.uid() = user_id);
