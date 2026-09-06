-- Tabela "active_trips" trzyma AKTUALNĄ aktywną podróż stylu "Baza
-- wypadowa" dla zalogowanego użytkownika — "user_id" jest tu kluczem
-- głównym (nie osobne "id"), bo z założenia jedna osoba ma naraz co
-- najwyżej JEDNĄ aktywną podróż: zapisanie nowej bazy ma ZASTĄPIĆ
-- poprzednią (upsert przez "on conflict (user_id) do update"), a nie
-- dokładać kolejny wiersz do nieskończonej listy. Odpowiednik angielskiej
-- nazwy tabeli dla polskiego pojęcia "aktywne podróże" — ten sam wzorzec
-- nazewnictwa co pozostałe tabele w tej bazie (saved_routes, favorites,
-- visited), mimo że interfejs jest po polsku.
--
-- "base_lat"/"base_lng" są zapisane wprost (nie tylko "base_slug"), bo
-- baza wypadowa nie zawsze ma własny rekord w tabeli "places" — może być
-- miejscem "podstawowym" z Geoapify (prefiks "geoapify-" w slugu, patrz
-- toBasicPlace w getRoutePlaces.ts), które nigdzie nie jest trwale
-- zapisane. Współrzędne wystarczą, żeby strona "Dziś w [baza]" policzyła
-- pobliskie atrakcje bez konieczności odtwarzania całej, złożonej logiki
-- doboru kandydatów (suggestBaseCandidates) tylko po to, żeby odnaleźć
-- bazę po slugu.
create table if not exists active_trips (
  user_id uuid primary key references auth.users (id) on delete cascade,
  base_slug text not null,
  base_title text not null,
  base_lat double precision not null,
  base_lng double precision not null,
  -- Czytelny opis regionu do wyświetlenia (np. "Morze — Środkowe
  -- wybrzeże") — nie używany do żadnej logiki, tylko do podpisu na
  -- stronie "Dziś w [baza]" i w menu.
  region text not null,
  start_date date not null default current_date,
  days integer not null,
  created_at timestamptz not null default now()
);

alter table active_trips enable row level security;

create policy "Users can view their own active trip"
  on active_trips for select
  using (auth.uid() = user_id);

create policy "Users can save their own active trip"
  on active_trips for insert
  with check (auth.uid() = user_id);

-- Potrzebne dla upsertu (zapisanie nowej bazy ma nadpisać poprzednią
-- aktywną podróż tego samego użytkownika, patrz komentarz przy tabeli
-- wyżej) — bez tej polityki "on conflict (user_id) do update" byłoby
-- odrzucane przez RLS mimo zgodnego user_id.
create policy "Users can update their own active trip"
  on active_trips for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can end their own active trip"
  on active_trips for delete
  using (auth.uid() = user_id);
