-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists noclegi (
  id uuid primary key default gen_random_uuid(),
  nazwa text not null,
  typ text not null check (typ in ('kemping', 'pole namiotowe', 'hotel', 'pensjonat')),
  lat double precision not null,
  lng double precision not null,
  -- Miejsce z tabeli places, przy którym ten nocleg leży najbliżej — pole
  -- redakcyjne/informacyjne (do wyświetlania i administracji). Faktyczny
  -- dobór noclegu do konkretnego dnia trasy liczy się dynamicznie po
  -- odległości od ostatniego przystanku (patrz src/lib/accommodation.ts),
  -- niezależnie od tego pola.
  miejsce_powiazane text references places(slug) on delete set null,
  udogodnienia text,
  poziom_komfortu text check (poziom_komfortu in ('budżetowy', 'standardowy', 'premium')),
  sort_order integer not null default 0
);

alter table noclegi enable row level security;

create policy "Allow public read access"
  on noclegi
  for select
  using (true);

insert into noclegi
  (nazwa, typ, lat, lng, miejsce_powiazane, udogodnienia, poziom_komfortu, sort_order)
values
  -- Wielkopolska — przybliżone współrzędne przy powiązanym miejscu (nie
  -- zweryfikowany dokładny adres, patrz komentarz w rozmowie).
  (
    'Camping Malta',
    'kemping',
    52.4083, 16.9511,
    'poznan',
    'Przyłącza elektryczne, sanitariaty, WiFi, blisko Term Maltańskich i toru saneczkowego nad jeziorem Malta.',
    'standardowy',
    1
  ),
  (
    'Pole namiotowe Dziekanowice',
    'pole namiotowe',
    52.5250, 17.3810,
    'ostrow-lednicki',
    'Dostęp do jeziora Lednica, wypożyczalnia kajaków, blisko przystani promowej na Ostrów Lednicki.',
    'budżetowy',
    2
  ),
  (
    'Camping Wiking',
    'kemping',
    52.7760, 17.7280,
    'biskupin',
    'Przyłącza elektryczne, miejsce na ognisko, sanitariaty, ok. 200 m od osady w Biskupinie.',
    'standardowy',
    3
  ),
  (
    'Pole namiotowe nad Gopłem',
    'pole namiotowe',
    52.6700, 18.3300,
    'kruszwica',
    'Dostęp do plaży nad Gopłem, wypożyczalnia rowerów wodnych, blisko Mysiej Wieży.',
    'budżetowy',
    4
  ),

  -- Wybrzeże — migracja z wolnego tekstu (places.rekomendowane_kempingi)
  -- do ustrukturyzowanych wierszy ze współrzędnymi.
  (
    'Camping Relax',
    'kemping',
    53.9096, 14.2478,
    'swinoujscie-miedzyzdroje-wolin',
    'Przyłącza elektryczne i wodne, sanitariaty, blisko plaży i promenady w Świnoujściu.',
    'standardowy',
    5
  ),
  (
    'Camping Tramp',
    'kemping',
    53.8567, 14.6144,
    'swinoujscie-miedzyzdroje-wolin',
    'Przyłącza elektryczne, miejsce dla kamperów, blisko wejścia do Wolińskiego Parku Narodowego.',
    'standardowy',
    6
  ),
  (
    'Camping Baltic',
    'kemping',
    54.1751, 15.5760,
    'kolobrzeg-dzwirzyno',
    'Przyłącza elektryczne i wodne, sanitariaty, blisko plaży i mola w Kołobrzegu.',
    'standardowy',
    7
  ),
  (
    'Camp Na Wydmie',
    'kemping',
    54.7597, 17.5536,
    'leba',
    'Przyłącza elektryczne, blisko wydm Słowińskiego Parku Narodowego i plaży w Łebie.',
    'standardowy',
    8
  ),
  (
    'Pole Namiotowe Horyzont',
    'pole namiotowe',
    54.8258, 18.3183,
    'jastrzebia-gora-chlapowo',
    'Prysznice, blisko zejścia klifowego Dolina Chłapowska i plaży.',
    'budżetowy',
    9
  ),
  (
    'Alexa Camping',
    'kemping',
    54.8261, 18.3170,
    'jastrzebia-gora-chlapowo',
    'Przyłącza elektryczne, miejsce dla kamperów, blisko plaży w Chłapowie.',
    'standardowy',
    10
  ),
  (
    'Kemping w Jastarni',
    'kemping',
    54.6975, 18.6874,
    'wladyslawowo-polwysep-helski',
    'Przyłącza elektryczne, blisko plaży i centrum Jastarni na Mierzei Helskiej.',
    'standardowy',
    11
  ),
  (
    'Kemping w Chałupach',
    'kemping',
    54.7627, 18.5301,
    'wladyslawowo-polwysep-helski',
    'Przyłącza elektryczne, blisko plaży windsurfingowej w Chałupach.',
    'standardowy',
    12
  ),
  (
    'Kemping w Krynicy Morskiej',
    'kemping',
    54.3843, 19.4432,
    'mierzeja-wislana',
    'Przyłącza elektryczne, blisko plaży i Wielbłądziego Garbu w Krynicy Morskiej.',
    'standardowy',
    13
  ),
  (
    'Kemping w Piaskach',
    'kemping',
    54.3667, 19.6514,
    'mierzeja-wislana',
    'Miejsce dla kamperów, spokojna okolica na końcu Mierzei Wiślanej.',
    'standardowy',
    14
  );
