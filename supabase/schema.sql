-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists places (
  slug text primary key,
  title text not null,
  region text not null,
  description text not null,
  long_description text not null,
  lat double precision not null,
  lng double precision not null,
  image text not null,
  image_alt text not null,
  image_position text,
  credit_author text not null,
  credit_license text not null,
  sort_order integer not null default 0
);

alter table places enable row level security;

create policy "Allow public read access"
  on places
  for select
  using (true);

insert into places
  (slug, title, region, description, long_description, lat, lng, image, image_alt, image_position, credit_author, credit_license, sort_order)
values
  (
    'biskupin',
    'Biskupin',
    'woj. kujawsko-pomorskie',
    'Rekonstruowana osada obronna sprzed ponad 2700 lat, jedno z najważniejszych stanowisk archeologicznych w Polsce.',
    'Biskupin to osada obronna kultury łużyckiej, odkryta w 1933 roku i uznawana za jedno z najważniejszych stanowisk archeologicznych w Europie Środkowej. Na miejscu znajduje się zrekonstruowana część osady z drewnianymi domami, wałem obronnym i bramami, a także muzeum archeologiczne. Co roku latem odbywa się tu Festyn Archeologiczny przyciągający tysiące zwiedzających.',
    52.7783,
    17.7345,
    '/images/biskupin.jpg',
    'Drewniana brama i wał obronny rekonstruowanej osady w Biskupinie',
    null,
    'MazAgnieszki',
    'CC BY-SA 4.0',
    1
  ),
  (
    'gniezno',
    'Gniezno',
    'woj. wielkopolskie',
    'Pierwsza stolica Polski, znana z katedry z Drzwiami Gnieźnieńskimi i koronacji pierwszych królów.',
    'Gniezno uznawane jest za pierwszą stolicę Polski i kolebkę polskiej państwowości. Największą atrakcją jest katedra gnieźnieńska z brązowymi Drzwiami Gnieźnieńskimi z XII wieku, przedstawiającymi sceny z życia św. Wojciecha. To tu koronowano pierwszych polskich władców, w tym Bolesława Chrobrego.',
    52.5347,
    17.5827,
    '/images/gniezno.jpg',
    'Katedra gnieźnieńska nocą, odbijająca się w wodzie jeziora',
    null,
    'Diego Delso',
    'CC BY-SA 4.0',
    2
  ),
  (
    'poznan',
    'Poznań',
    'woj. wielkopolskie',
    'Jedno z najstarszych miast Polski z Ostrowem Tumskim, kolorowym Starym Rynkiem i słynnymi koziołkami.',
    'Poznań to jedno z najstarszych i najważniejszych historycznie miast Polski. Warto zobaczyć Ostrów Tumski z katedrą poznańską, kolorowe kamieniczki na Starym Rynku oraz ratusz, z którego codziennie w południe wychodzą charakterystyczne koziołki. Miasto oferuje też bogatą ofertę gastronomiczną i kulturalną.',
    52.4064,
    16.9252,
    '/images/poznan.jpg',
    'Kolorowe kamieniczki i ratusz na Starym Rynku w Poznaniu',
    null,
    'Historia3012',
    'CC BY-SA 4.0',
    3
  ),
  (
    'lad',
    'Ląd',
    'woj. wielkopolskie',
    'Urokliwa miejscowość nad Wartą z barokowym zespołem klasztornym pocysterskim.',
    'Ląd to niewielka miejscowość nad Wartą, znana przede wszystkim z okazałego, barokowego zespołu klasztornego pocysterskiego. Opactwo zachwyca bogato zdobionym wnętrzem kościoła oraz malowniczym położeniem nad rzeką, co czyni je popularnym punktem na trasach rowerowych i kajakowych po regionie.',
    52.2989,
    17.9553,
    '/images/lad.jpg',
    'Barokowy zespół klasztorny pocysterski w Lądzie',
    null,
    'Mzopw',
    'CC BY-SA 3.0',
    4
  ),
  (
    'kruszwica',
    'Kruszwica',
    'woj. kujawsko-pomorskie',
    'Miasto nad Gopłem, znane z Mysiej Wieży i legendy o królu Popielu.',
    'Kruszwica leży nad malowniczym jeziorem Gopło i jest jednym z najstarszych miast w Polsce. Jej symbolem jest gotycka Mysia Wieża, z którą wiąże się legenda o królu Popielu zjedzonym przez myszy. Warto też przejść się bulwarem nad Gopłem i wybrać się na rejs statkiem po jeziorze.',
    52.6753,
    18.3236,
    '/images/kruszwica.jpg',
    'Gotycka Mysia Wieża w Kruszwicy otoczona drzewami',
    'top',
    'SP2DKI',
    'CC BY-SA 3.0 pl',
    5
  )
on conflict (slug) do nothing;
