-- Punkt 2 zgłoszenia (23.08): Kórnik i Rogalin nie miały tagu "Zamki i
-- Pałace" mimo pasującej treści (były otagowane tylko Historia/Architektura/
-- Natura) — menu boczne po naprawie filtrowania nie pokazywało ich pod tą
-- kategorią.
update places
set tags = array['Historia', 'Architektura', 'Natura', 'Zamki i Pałace']
where slug = 'kornik-i-rogalin';

-- Punkt 3 zgłoszenia: 8 nowych miejsc kuratorskich, kategoria "Zamki i
-- Pałace", region Wielkopolska. Współrzędne i fakty źródłowe zweryfikowane
-- indywidualnie (polska Wikipedia + oficjalne strony obiektów, 23.08).
-- Zdjęcia pobrane z Wikimedia Commons (public/images/<slug>.jpg), z
-- zachowaniem wymaganej atrybucji autora i licencji przy każdym wpisie.
insert into places (
  slug, title, region, description, long_description, lat, lng,
  image, image_alt, image_position, credit_author, credit_license,
  sort_order, tags, typ_regionu, otoczenie, blizkosc_atrakcji
) values

(
  'zamek-w-goluchowie',
  'Zamek w Gołuchowie',
  'Wielkopolska',
  'Renesansowa budowla przypominająca zamki nad Loarą, otoczona ogromnym parkiem-arboretum.',
  'Gdyby przenieść ten zamek nad Loarę, nikt by się nie zdziwił — i to wcale nie przypadek. Gołuchów zaczynał skromnie: w połowie XVI wieku Rafał Leszczyński postawił tu czworoboczną, renesansową budowlę obronną z basztami w narożnikach. Przez ponad trzysta lat była to solidna, ale niczym niewyróżniająca się rezydencja magnacka. Wszystko zmieniło się w 1853 roku, gdy majątek kupił Tytus Działyński, a po nim Izabela z Czartoryskich Działyńska.

To Izabela nadała Gołuchowowi twarz, którą zna dziś każdy odwiedzający. Sprowadziła do Wielkopolski francuskich architektów — prace prowadził Maurice Ouradou, zięć i uczeń samego Eugène''a Viollet-le-Duca, słynnego francuskiego konserwatora zamków znad Loary. Renesansowy rdzeń budowli przetrwał, ale otoczyły go strome dachy, wieżyczki i detale wprost z zamków Touraine — stąd wrażenie, że stoi się przed czymś przeniesionym z Francji, a nie z sercem Wielkopolski.

Równie ważna jak sam zamek jest otaczająca go zieleń. Izabela założyła tu 158-hektarowe arboretum, jedno z najstarszych i najbogatszych w tej części Europy — rosną w nim gatunki drzew, których nie zobaczy się nigdzie indziej w Polsce, w tym potężny dąb "Jan" o obwodzie ponad 5 metrów. Od 1951 roku zamek jest oddziałem Muzeum Narodowego w Poznaniu, a w jego wnętrzach można obejrzeć m.in. obrazy Fransa Florisa i starożytne greckie wazy z prywatnych wykopalisk rodziny Działyńskich.

Co warto poczuć na miejscu: przejść alejkami arboretum wśród drzew starszych niż niejedno miasto, zatrzymać się przy dębie "Jan" i spróbować objąć go wzrokiem. Stanąć przed fasadą zamku i poszukać w głowie skojarzenia z Loarą — ono samo się narzuci, zanim ktokolwiek zdąży je podpowiedzieć.

Informacje praktyczne: zamek (Muzeum Narodowe w Poznaniu, oddział) czynny z przerwą na poniedziałki, wstęp biletowany, osobny bilet do arboretum (da się łączyć). Warto zarezerwować na całość co najmniej pół dnia — sam park zasługuje na spokojny spacer.',
  51.852639, 17.933336,
  '/images/zamek-w-goluchowie.jpg',
  'Renesansowo-romantyczny zamek w Gołuchowie z wieżyczkami w stylu zamków znad Loary',
  'center',
  'P.R.Schreyner',
  'CC BY-SA 3.0 pl',
  27,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array['Głusza/las'],
  null
),

(
  'zamek-w-rydzynie',
  'Zamek w Rydzynie',
  'Wielkopolska',
  'Barokowa rezydencja Leszczyńskich i Sułkowskich, dziś hotel i restauracja.',
  'Rydzyna miała szczęście i pecha jednocześnie — szczęście, bo stała się siedzibą jednego z najważniejszych rodów Rzeczpospolitej, pecha, bo to samo znaczenie sprowadzało na nią kolejne zniszczenia. Pierwszy, gotycki zamek stanął tu już w latach 1403–1422, na sztucznej wyspie, ale nie przetrwał najazdu szwedzkiego w XVII wieku. Na jego fundamentach, w latach 1685–1695, wzniesiono barokową rezydencję, którą znamy dziś — według projektu królewskiego architekta, Pompeo Ferrariego lub Józefa Szymona Bellottiego.

Właścicielami Rydzyny byli kolejno Leszczyńscy herbu Wieniawa, w tym Stanisław Leszczyński — dwukrotny król Polski, który zanim ostatecznie opuścił kraj w 1736 roku, sprzedał majątek Aleksandrowi Józefowi Sułkowskiemu, jednemu z najpotężniejszych magnatów na dworze saskim. To właśnie w zamkowym teatrze Rydzyny w 1687 roku odbyła się jedna z pierwszych na ziemiach polskich premier komedii Moliera. Sułkowscy przebudowali rezydencję w latach 1742–1745, nadając jej ostateczny, barokowy kształt.

Historia zapłaciła tu wysoką cenę w 1945 roku — wojska sowieckie splądrowały i spaliły zamek, zostawiając jedynie mury. Odbudowa trwała dekadami: najpierw sama bryła (1950–1965), potem wnętrza (1972–1977). W marcu 2017 roku zamek uzyskał status pomnika historii, a w grudniu 2023 roku oficjalnie zmienił nazwę na Zamek Królewski w Rydzynie — w uznaniu związku z panowaniem Stanisława Leszczyńskiego.

Co warto poczuć na miejscu: stanąć na dziedzińcu i pomyśleć, że dokładnie w tym miejscu grano Moliera niemal 340 lat temu, na długo zanim teatr na stałe zagościł w Warszawie. Przejść się wokół fosy i zamkowego stawu — tego samego układu wodnego, który chronił jeszcze średniowieczną, gotycką warownię.

Informacje praktyczne: zamek działa dziś jako hotel, restauracja i ośrodek konferencyjny (prowadzony przez Stowarzyszenie Inżynierów i Techników Mechaników Polskich) — zwiedzanie części reprezentacyjnej i dziedzińca możliwe w ramach pobytu lub po wcześniejszym uzgodnieniu na miejscu.',
  51.787369, 16.671042,
  '/images/zamek-w-rydzynie.jpg',
  'Barokowa fasada Zamku Królewskiego w Rydzynie z bogato zdobionym portalem wejściowym',
  'center',
  'Dawid Galus',
  'CC BY-SA 3.0 pl',
  28,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array[]::text[],
  null
),

(
  'zamek-krolewski-w-poznaniu',
  'Zamek Królewski w Poznaniu',
  'Wielkopolska',
  'Odbudowana siedziba królewska na Górze Przemysła, z wieżą widokową.',
  'Zamek Królewski w Poznaniu to budowla, która przez siedem stuleci była niszczona i odbudowywana chyba częściej niż jakakolwiek inna rezydencja w Wielkopolsce — a mimo to wciąż stoi na tym samym wzgórzu, które od niej wzięło nazwę: Góra Przemysła. Pierwszą, murowaną wieżę mieszkalną wzniósł tu w połowie XIII wieku Przemysł I, a jego syn, Przemysł II — koronowany później na króla Polski — rozbudował ją około 1290 roku w prawdziwy zamek królewski.

Lista nieszczęść, jakie spotkały budowlę, jest długa: pożar w 1536 roku, zniszczenia potopu szwedzkiego około 1657 roku, wojna północna w 1704 roku, pruska rozbiórka w latach 1795–1796, wreszcie zagłada w 1945 roku. Każda z tych katastrof mogłaby zamknąć historię zamku na dobre, a jednak za każdym razem ktoś podejmował się odbudowy. Ostatnie duże prace, obejmujące południową część założenia według projektu Witolda Milewskiego, ukończono w latach 2010–2013 — a w 2016 roku otwarto dla zwiedzających wieżę widokową, z której roztacza się widok na całe Stare Miasto.

Dziś zamek pełni funkcje muzealne — mieści się w nim Muzeum Sztuk Użytkowych (oddział Muzeum Narodowego w Poznaniu) wraz z pracowniami muzealnymi, gdzie można zobaczyć rzemiosło artystyczne z wielu epok.

Co warto poczuć na miejscu: wejść na wieżę widokową i spojrzeć w dół, na plac i uliczki Starego Miasta, które przez wieki żyły w cieniu tego wzgórza. Stanąć przy murach i spróbować policzyć, przez ile katastrof przeszła ta budowla, zanim doczekała się obecnego kształtu — trudno o lepszą lekcję o tym, jak burzliwa bywała historia Wielkopolski.

Informacje praktyczne: teren zamku dostępny w ramach zwiedzania Muzeum Sztuk Użytkowych, wstęp biletowany; wejście na wieżę widokową sezonowe i zależne od pogody — warto sprawdzić aktualne godziny przed wizytą.',
  52.409167, 16.931111,
  '/images/zamek-krolewski-w-poznaniu.jpg',
  'Ceglana wieża i gotycko-renesansowe skrzydło Zamku Królewskiego w Poznaniu na Górze Przemysła',
  'center',
  'SchiDD',
  'CC BY-SA 4.0',
  29,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array['W centrum miasta'],
  null
),

(
  'zamek-cesarski-w-poznaniu',
  'Zamek Cesarski w Poznaniu',
  'Wielkopolska',
  'Monumentalna rezydencja ostatnich cesarzy niemieckich w stylu neoromańskim.',
  'To jedyny w swoim rodzaju zabytek: ostatni zamek królewski wzniesiony w Europie. Zbudowany w latach 1905–1910 dla cesarza Wilhelma II według projektu Franza Schwechtena, miał być manifestem potęgi Cesarstwa Niemieckiego w mieście, które władze pruskie chciały na trwałe zgermanizować. Wilhelm II osobiście uważał styl neoromański za "najbardziej niemiecki" i "reprezentujący blask Świętego Cesarstwa Rzymskiego" — stąd surowa, ciężka bryła z charakterystyczną, 75-metrową wieżą, budowa kosztowała 5 milionów marek, a gotowa rezydencja liczyła 585 pomieszczeń.

Ironia historii sprawiła, że budowla pomyślana jako symbol niemieckiej dominacji nigdy nie pełniła tej roli długo — Wilhelm II stracił tron już w 1918 roku, osiem lat po odebraniu kluczy od architekta. W czasie II wojny światowej zamek miał służyć jako rezydencja Adolfa Hitlera i nazistowskiego namiestnika Kraju Warty, Arthura Greisera; w lutym 1945 roku funkcjonował krótko jako obóz jeniecki, później mieściły się w nim polskie koszary wojskowe.

Dziś ta sama budowla, która miała onegdaj onieśmielać, tętni zupełnie innym życiem — działa w niej Centrum Kultury Zamek, z Teatrem Animacji i Centrum Sztuki Dziecka, organizujące wystawy, koncerty i spektakle. Trudno o lepszy przykład tego, jak miejsce może całkowicie zmienić swoje znaczenie, nie zmieniając ani jednej cegły.

Co warto poczuć na miejscu: stanąć przed monumentalną fasadą i zderzyć w głowie jej pierwotny, imperialny cel z dzisiejszą funkcją — kina, teatru, miejsca spotkań poznaniaków. Zajrzeć na aktualny program wystaw czy spektakli, żeby zamek zwiedzić "od środka", a nie tylko z zewnątrz.

Informacje praktyczne: budynek dostępny jako Centrum Kultury Zamek — zwiedzanie architektury możliwe przy okazji wydarzeń kulturalnych, część przestrzeni ogólnodostępna bez biletu w godzinach otwarcia centrum; warto sprawdzić bieżący program przed wizytą.',
  52.407778, 16.918611,
  '/images/zamek-cesarski-w-poznaniu.jpg',
  'Neoromańska fasada Zamku Cesarskiego w Poznaniu z charakterystyczną wieżą zegarową',
  'center',
  'Scotch Mist',
  'CC BY-SA 3.0',
  30,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array['W centrum miasta'],
  null
),

(
  'palac-mysliwski-w-antoninie',
  'Pałac Myśliwski w Antoninie',
  'Wielkopolska',
  'Drewniany pałac myśliwski Radziwiłłów o unikalnej konstrukcji centralnej, bywał tu Fryderyk Chopin.',
  'Antonin to jeden z tych budynków, które trzeba zobaczyć, żeby uwierzyć, że architekt naprawdę mógł tak pomyśleć. Drewniany pałac myśliwski, zbudowany w latach 1822–1824 dla księcia Antoniego Radziwiłła według projektu Karla Friedricha Schinkla — jednego z najwybitniejszych architektów epoki — wzniesiono na planie krzyża greckiego. Ośmioboczny korpus główny, do którego dobudowano cztery niższe skrzydła, kryje w środku ogromną, trzykondygnacyjną salę, sięgającą samego dachu.

To właśnie ta centralna sala robi tu największe wrażenie — jej ścianami biegną galerie, a między nimi rozwieszono dziesiątki myśliwskich trofeów, poroży jeleni patrzących w dół na gości, dokładnie tak, jak zaplanowano to dwieście lat temu. Rzadko która budowla myśliwska w Europie zachowała ten klimat w tak nienaruszonym stanie.

Antonin ma też swój rozdział w historii muzyki. Fryderyk Chopin odwiedził pałac dwukrotnie, w 1827 i 1829 roku, komponując utwory specjalnie dla księcia Radziwiłła i jego córki Elizy — to właśnie ona, ucząc się gry na fortepianie od samego kompozytora, naszkicowała dwa znane dziś portrety młodego Chopina. Do dziś echo tamtych wizyt słychać na dorocznym Festiwalu Chopinowskim "Chopin w barwach jesieni", organizowanym w pałacowych wnętrzach.

Co warto poczuć na miejscu: wejść do centralnej sali i spojrzeć w górę, na trzy kondygnacje galerii i rzędy poroży — to widok, który od razu tłumaczy, czemu ten budynek nazywa się "pałacem myśliwskim", a nie zwykłym dworem. Posłuchać, jeśli trafi się okazja, koncertu w tych samych wnętrzach, w których grywał sam Chopin.

Informacje praktyczne: pałac działa dziś jako hotel z restauracją, zwiedzanie wnętrz (w tym słynnej sali głównej) możliwe w ramach oferty turystycznej ośrodka — warto sprawdzić aktualne godziny i ewentualną rezerwację przed wizytą, zwłaszcza w trakcie festiwalu.',
  51.516703, 17.851753,
  '/images/palac-mysliwski-w-antoninie.jpg',
  'Drewniany pałac myśliwski w Antoninie zaprojektowany przez Karla Friedricha Schinkla',
  'center',
  'LukaszKalisz',
  'CC BY-SA 3.0 pl',
  31,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array['Głusza/las'],
  null
),

(
  'palac-w-dobrzycy',
  'Pałac w Dobrzycy',
  'Wielkopolska',
  'Klasycystyczny pałac z angielskim parkiem i Muzeum Ziemiaństwa.',
  'Dobrzyca to jeden z czystszych przykładów klasycyzmu w Wielkopolsce — pałac zbudowany w latach 1798–1799 dla generała Augustyna Gorzeńskiego, według projektu Stanisława Zawadzkiego, nadwornego architekta czynnego przy niejednej rezydencji tamtej epoki. Wewnątrz zachowała się bogata, wysokiej klasy dekoracja ścienna autorstwa Antoniego Smuglewicza — rzadkość, biorąc pod uwagę, jak wiele podobnych wnętrz nie przetrwało kolejnych stuleci w oryginalnym stanie.

A prawie nie przetrwały i te. W latach 1940–1941, w czasie okupacji, pałac zamieniono na magazyn zboża, co doszczętnie zniszczyło wszystkie parkiety. Powojenna renowacja odtworzyła jednak kompletny program dekoracyjny we wszystkich pomieszczeniach — dziś trudno uwierzyć, patrząc na te wnętrza, że kiedykolwiek służyły za skład ziarna.

Od 2005 roku w pałacu działa Muzeum Ziemiaństwa, opowiadające o życiu polskiej szlachty i ziemiaństwa na przestrzeni wieków — od codzienności dworu po rolę, jaką te warstwy odgrywały w regionie. W 2019 roku cały zespół pałacowo-parkowy uzyskał status pomnika historii. Otacza go 10,5-hektarowy angielski park krajobrazowy z 31 pomnikami przyrody, a na jego terenie stoją też monopter, budowla w typie panteonu oraz zachowane kamienie dawnego cmentarza żydowskiego.

Co warto poczuć na miejscu: przejść przez wnętrza odtworzone tak wiernie, że trudno dostrzec ślad wojennych zniszczeń, i zestawić to w głowie z wiedzą, że jeszcze 80 lat temu leżało tu zboże zamiast mebli. Zrobić spokojny spacer po parku, szukając kolejnych z 31 pomników przyrody.

Informacje praktyczne: Muzeum Ziemiaństwa w Pałacu w Dobrzycy czynne z przerwą w dni ustawowo wolne, wstęp biletowany, park dostępny w godzinach otwarcia muzeum.',
  51.865622, 17.605294,
  '/images/palac-w-dobrzycy.jpg',
  'Klasycystyczny pałac w Dobrzycy z kolumnowym portykiem, widziany znad przypałacowego stawu',
  'center',
  'Lucaok',
  'CC BY-SA 3.0',
  32,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array['Głusza/las'],
  null
),

(
  'palac-w-wasowie',
  'Pałac w Wąsowie',
  'Wielkopolska',
  'XIX-wieczny kompleks pałacowo-folwarczny, dziś hotel i restauracja.',
  'Wąsowo kryje w sobie dwie różne opowieści o wielkopolskim ziemiaństwie, bo stoją tu w istocie dwa pałace. Starszy, klasycystyczny, z elementami barokowymi, zbudowano w latach 1780–1786 dla Sylwestra Sczanieckiego — na fasadzie do dziś widać herby rodowe Ogończyk i Ossoria, wkomponowane w trójkątny fronton nad trójosiowym ryzalitem. To w tym budynku, po śmierci rodziców, dorastała Emilia Sczaniecka, później znana działaczka społeczna i patriotka epoki powstań narodowych.

W drugiej połowie XIX wieku majątek trafił w ręce berlińskiego bankiera Richarda Hardta, który uczynił Wąsowo główną siedzibą swojej rodziny i wzniósł obok starszego pałacu drugi, nowszy budynek z 1872 roku — tak powstał kompleks, jaki można oglądać dziś, łączący dwie różne epoki i dwie różne wizje rezydencji ziemiańskiej na jednej posiadłości.

Od 1995 roku prywatny właściciel prowadzi tu centrum hotelowo-restauracyjne, dbając o zachowanie oryginalnej architektury i dekoracji wnętrz. To rzadki przykład rezydencji, która nie stała się muzeum "zamrożonym w czasie", tylko żywym miejscem — z jazdami bryczką, krytym basenem, saunami i polami do minigolfa w otaczającym parku.

Co warto poczuć na miejscu: stanąć przed starszym pałacem i odszukać na fasadzie herby Ogończyk i Ossoria — mały detal heraldyczny, który łączy budynek z konkretną, historyczną rodziną, a nie tylko z ogólną kategorią "zabytkowa rezydencja". Przejść się po parku łączącym dwie różne epoki architektury ziemiańskiej.

Informacje praktyczne: pałac działa jako hotel i restauracja — zwiedzanie części reprezentacyjnej i parku możliwe w ramach pobytu lub wizyty w restauracji, warto zarezerwować stolik lub sprawdzić dostępność wcześniej.',
  52.365809, 16.248702,
  '/images/palac-w-wasowie.jpg',
  'Ceglany pałac w Wąsowie widziany znad stawu w otaczającym go parku',
  'center',
  'P.R.Schreyner',
  'CC BY-SA 3.0 pl',
  33,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array['Głusza/las'],
  null
),

(
  'palac-w-lewkowie',
  'Pałac w Lewkowie',
  'Wielkopolska',
  'Klasycystyczna rezydencja z bogatymi zdobieniami po rewitalizacji.',
  'Lewków to podręcznikowy przykład polskiego klasycyzmu — i to dosłownie, bo pałac zaprojektował Jan Chrystian Kamsetzer, nadworny architekt króla Stanisława Augusta Poniatowskiego i jeden z najwybitniejszych twórców tego nurtu w Rzeczpospolitej. Budowla powstała w latach 1788–1791 jako rodowa siedziba Wojciecha Lipskiego i jego żony Salomei z Objezierskich, i jest wierną kopią pałacu w Siernikach koło Wągrowca — należy do pierwszej serii klasycystycznych rezydencji wzniesionych w Wielkopolsce.

Murowany, dwukondygnacyjny budynek na planie prostokąta zdobi czterokolumnowy, jońskiego porządku portyk zwieńczony trójkątnym tympanonem. Nad wejściem, w tympanonie, fundator umieścił osobiste przesłanie, które do dziś można odczytać na fasadzie: "Sobie, Swoim, Przyjaciołom, Potomności" — motto, które w kilku słowach streszcza całą filozofię ziemiańskiej rezydencji tamtej epoki.

Po latach zaniedbania pałac przeszedł kompleksową rewitalizację, ukończoną w 2022 roku — dziś znów olśniewa detalem architektonicznym, jakiego można się było spodziewać po jednym z pierwszych dzieł polskiego klasycyzmu w regionie. W 2021 roku zrewitalizowano też otaczający park, przywracając mu dawny wygląd. Budynek zyskał nową funkcję jako muzeum i centrum edukacyjne, poświęcone historii regionu.

Co warto poczuć na miejscu: stanąć przed portykiem i odczytać napis "Sobie, Swoim, Przyjaciołom, Potomności" — rzadko która fasada w Polsce tak wprost tłumaczy, po co w ogóle budowano takie rezydencje. Porównać w głowie stan sprzed rewitalizacji (zaniedbanie) z tym, co widać dziś — to jedna z bardziej udanych historii ratowania wielkopolskiego dziedzictwa ostatnich lat.

Informacje praktyczne: pałac działa jako muzeum i centrum edukacyjne, wstęp i godziny zwiedzania warto sprawdzić przed wizytą, park dostępny bezpłatnie w godzinach otwarcia.',
  51.694786, 17.864808,
  '/images/palac-w-lewkowie.jpg',
  'Klasycystyczny pałac w Lewkowie z kolumnowym portykiem jońskim po rewitalizacji',
  'center',
  'Marek Mróz',
  'CC BY 4.0',
  34,
  array['Historia', 'Architektura', 'Zamki i Pałace'],
  array[]::text[],
  array['Głusza/las'],
  null
);
