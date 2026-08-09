-- Uruchom w Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists trasy (
  id bigint generated always as identity primary key,
  nazwa text not null,
  kategoria text not null,
  dlugosc_km integer not null,
  przebieg text not null,
  opis text not null
);

alter table trasy enable row level security;

create policy "Allow public read access"
  on trasy
  for select
  using (true);

insert into trasy (nazwa, kategoria, dlugosc_km, przebieg, opis)
values
  (
    'Mierzeja Helska',
    'Nadmorskie',
    36,
    'Władysławowo – Chałupy – Kuźnica – Jastarnia – Jurata – Hel',
    'Jedyna droga na koniec półwyspu, morze z jednej strony, Zatoka Pucka z drugiej; latem bywa tłoczno.'
  ),
  (
    'Droga Kaszubska',
    'Nadmorskie',
    20,
    'Chmielno – Zawory – Ręboszewo – Brodnica Dolna – Ostrzyce – Wieżyca',
    'Krótka trasa gęsto upakowana punktami widokowymi i jeziorami przez Kaszubski Park Krajobrazowy.'
  ),
  (
    'Szlak Zamków Gotyckich',
    'Historyczno-zamkowe',
    560,
    'Bytów – Malbork – Sztum – Gniew – Kwidzyn – Ostróda – Nidzica – Olsztyn – Lidzbark Warmiński – Kętrzyn – Ryn',
    '12 warownych zamków krzyżackich i biskupich przez Warmię, Mazury i Kaszuby.'
  ),
  (
    'Szlak Orlich Gniazd',
    'Historyczno-zamkowe',
    300,
    'Olsztyn (śląski) – Ogrodzieniec – Pilica – Pieskowa Skała – Ojców – Rudno',
    '19 zamków i warowni z czasów Kazimierza Wielkiego na Jurze Krakowsko-Częstochowskiej.'
  ),
  (
    'Wielka Pętla Bieszczadzka',
    'Górskie',
    143,
    'Lesko – Cisna – Wetlina – Ustrzyki Górne – Ustrzyki Dolne – Lesko',
    'Najdłuższy odcinek serpentyn w Polsce przez Góry Słonne, dzika i kameralna okolica.'
  ),
  (
    'Trasa Dolnośląska',
    'Górskie',
    257,
    'Wrocław – Kłodzko – Kudowa-Zdrój – Wałbrzych – Zamek Książ – Świdnica',
    'Zabytki UNESCO, zamki i uzdrowiska w otoczeniu Gór Stołowych.'
  ),
  (
    'Beskid Śląski (Koniaków)',
    'Górskie',
    40,
    'Szczyrk – Wisła – Istebna – Koniaków',
    'Kręte, strome drogi i wieś słynąca z ręcznego koronczarstwa.'
  ),
  (
    'Droga Oswalda Balzera',
    'Górskie',
    23,
    'Zakopane – Jaszczurówka – Morskie Oko',
    'Malownicza, ale najbardziej oblegana trasa na liście.'
  ),
  (
    'Pętla Mazurska',
    'Pojezierza i natura',
    356,
    'Olsztyn – Mrągowo – Ryn – Kętrzyn – Giżycko – Mikołajki – Olsztyn',
    'Jeziora, zabytkowe zamki i obiekty militarne Krainy Wielkich Jezior Mazurskich.'
  ),
  (
    'Kanał Augustowski',
    'Pojezierza i natura',
    96,
    '15 zabytkowych śluz od Dębowa do Rudawki',
    'Najdłuższy zabytek hydrotechniczny w Polsce, dobra też jako trasa rowerowa.'
  );
