-- Zgłoszenie 23.08 ("Parki Narodowe" pokazuje bagna i torfowiska zamiast
-- parków narodowych): przyczyną było zbyt szerokie mapowanie kategorii
-- Geoapify (naprawione w kodzie — patrz placesProviders/geoapify.ts), ale
-- lepszym rozwiązaniem niż poleganie wyłącznie na automatycznym dostawcy
-- jest kuratorska treść. Słowiński Park Narodowy już był w bazie (region
-- Pomorze), ale bez tagu "Parki Narodowe" — dokładnie ten sam rodzaj
-- przeoczenia co Kórnik i Rogalin bez tagu "Zamki i Pałace" wcześniej.
update places
set tags = array['Natura', 'Aktywność fizyczna', 'Parki Narodowe']
where slug = 'slowinski-park-narodowy';

-- Wielkopolski Park Narodowy nie istniał wcale w bazie kuratorskiej.
-- Współrzędne (siedziba/Muzeum Przyrodnicze w Jeziorach, nad Jeziorem
-- Góreckim) zweryfikowane na polskiej Wikipedii, 23.08. Uwaga: te
-- współrzędne (16.7973°E) leżały ok. 7 km poza pierwotną granicą
-- WIELKOPOLSKA_BOUNDS (minLng 16.9) — granica poprawiona w tym samym
-- commicie (poland.ts, minLng teraz 16.75), bo park bezsprzecznie należy
-- do regionu, którego nazwę nosi.
insert into places (
  slug, title, region, description, long_description, lat, lng,
  image, image_alt, image_position, credit_author, credit_license,
  sort_order, tags, typ_regionu, otoczenie, blizkosc_atrakcji
) values
(
  'wielkopolski-park-narodowy',
  'Wielkopolski Park Narodowy',
  'Wielkopolska',
  'Polodowcowy krajobraz jezior, moren i starych borów tuż pod Poznaniem — najstarszy tego typu park w regionie.',
  'Wielkopolski Park Narodowy leży dosłownie na progu Poznania — w trójkącie między Luboniem, Stęszewem i Mosiną, wzdłuż doliny Warty — a mimo to od 1957 roku chroni krajobraz, który wygląda, jakby czas płynął tu wyraźnie wolniej niż w pobliskiej metropolii. To jeden z najstarszych parków narodowych w tej części Polski, obejmujący niemal 7,6 tys. hektarów rdzenia i kolejne kilka tysięcy hektarów otuliny.

Krajobraz parku ukształtowało ostatnie zlodowacenie — moreny, ozy i drumliny (wydłużone wzniesienia polodowcowe) przecinają teren pełen jezior polodowcowych, z których największą sławę ma Jezioro Góreckie, otoczone starym lasem i objęte ścisłą ochroną na powierzchni niemal 65 hektarów. W granicach parku wyznaczono aż 18 obszarów ochrony ścisłej (łącznie 260 ha) — fragmentów lasu, do których człowiek celowo nie ingeruje, żeby zobaczyć, jak przyroda radzi sobie sama.

Symbolem parku jest "Głaz Leśników" — największy głaz narzutowy w okolicy, przywleczony tu przez lądolód tysiące lat temu, o obwodzie ponad 10 metrów. W lasach WPN rośnie ponad 900 gatunków roślin naczyniowych, żyje 227 gatunków ptaków i ponad 40 gatunków ssaków — od jeleni i dzików po kunę leśną. Siedziba dyrekcji parku w Jeziorach, w dawnej rezydencji nad Jeziorem Góreckim, mieści dziś Muzeum Przyrodnicze z ekspozycją poświęconą tutejszej faunie i florze.

Co warto poczuć na miejscu: stanąć nad brzegiem Jeziora Góreckiego i posłuchać ciszy, o którą trudno kilkanaście kilometrów dalej, w centrum Poznania. Dotknąć "Głazu Leśników" i spróbować wyobrazić sobie lądolód, który przyniósł go tu z odległej Skandynawii. Wejść do Muzeum Przyrodniczego w Jeziorach, żeby zobaczyć z bliska to, co w samym lesie łatwo przeoczyć.

Informacje praktyczne: park dostępny bezpłatnie (oznakowane szlaki piesze i rowerowe), Muzeum Przyrodnicze w Jeziorach czynne z przerwą na poniedziałki, wstęp biletowany. Ze względu na bliskość Poznania to popularny cel jednodniowych wycieczek — warto przyjechać wcześnie, zwłaszcza w weekendy.',
  52.268861, 16.797250,
  '/images/wielkopolski-park-narodowy.jpg',
  'Jezioro Góreckie w Wielkopolskim Parku Narodowym, otoczone starym lasem',
  'center',
  'MOs810',
  'CC BY-SA 4.0',
  35,
  array['Natura', 'Aktywność fizyczna', 'Parki Narodowe'],
  array[]::text[],
  array['Głusza/las'],
  null
);
