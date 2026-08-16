-- Tabele "favorites" i "visited" trzymają, które miejsca dany zalogowany
-- użytkownik polubił / odwiedził. Dane miejsca (tytuł, zdjęcie) są
-- celowo zduplikowane w wierszu (nie tylko slug), bo miejsca "podstawowe"
-- (z Geoapify) nie mają własnego rekordu w tabeli "places" — bez tego
-- lista ulubionych/odwiedzonych nie miałaby skąd wziąć tytułu/zdjęcia dla
-- takiego miejsca. "place_source" to "curated" albo "basic", tak jak pole
-- Place.source w kodzie appki.

create table if not exists favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_slug text not null,
  place_title text not null,
  place_image text,
  place_image_alt text,
  place_source text not null default 'curated',
  created_at timestamptz not null default now(),
  primary key (user_id, place_slug)
);

alter table favorites enable row level security;

create policy "Users can view their own favorites"
  on favorites for select
  using (auth.uid() = user_id);

create policy "Users can add their own favorites"
  on favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on favorites for delete
  using (auth.uid() = user_id);

create table if not exists visited (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_slug text not null,
  place_title text not null,
  place_image text,
  place_image_alt text,
  place_source text not null default 'curated',
  created_at timestamptz not null default now(),
  primary key (user_id, place_slug)
);

alter table visited enable row level security;

create policy "Users can view their own visited places"
  on visited for select
  using (auth.uid() = user_id);

create policy "Users can add their own visited places"
  on visited for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own visited places"
  on visited for delete
  using (auth.uid() = user_id);
