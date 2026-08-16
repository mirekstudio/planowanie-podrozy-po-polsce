-- Uruchom w Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Dodaje 7 nowych, kuratorskich miejsc reprezentujących trasę
-- Ustka - Chłapowo na środkowym wybrzeżu. Nie ma osobnej kolumny
-- "poziom_kuracji" - status "kuratorskie" jest w tej appce niejawny:
-- każdy wiersz w tabeli "places" jest z definicji kuratorski (patrz
-- src/lib/getPlaces.ts, mapRow ustawia source: "curated" dla każdego
-- rekordu z Supabase). Miejsca "podstawowe" (source: "basic") nigdy nie
-- trafiają do tej tabeli - powstają w locie z Geoapify.

insert into places (
  slug, title, region, description, long_description, lat, lng,
  image, image_alt, image_position, credit_author, credit_license,
  sort_order, tags, typ_regionu, otoczenie, blizkosc_atrakcji
) values

(
  'ustka',
  'Ustka',
  'Pomorze',
  'Kurort z duszą portu rybackiego - latarnia, tętniący życiem port i podziemne trasy Bunkrów Blüchera.',
  'Zapach wędzonej ryby unoszący się znad kutrów, skrzyp lin cumowniczych i czerwona latarnia stojąca po zachodniej stronie ujścia Słupi - Ustka wita się z każdym, kto tu przyjeżdża, dokładnie tak samo, jak witała się z pokoleniami rybaków przed nim. To nie jest kurort udający port. To port, który po drodze stał się kurortem.

Miasto wyrosło z osady rybackiej u ujścia Słupi i do dziś ten rodowód widać na każdym kroku - falochrony, kutry wracające z połowu, hale rybne, w których można kupić rybę prosto z sieci. Ale Ustka ma też drugie, mroczniejsze oblicze: w lasach na wschód od miasta, w Rowach, ukryty jest kompleks Bunkrów Blüchera - podziemny system korytarzy i schronów budowany przez Niemców pod koniec II wojny światowej, dziś częściowo udostępniony do zwiedzania z latarką w ręku.

Co warto poczuć na miejscu: wejdź na molo o świcie, kiedy kutry wracają z nocnego połowu, i zobacz, jak miasto budzi się od portu, a nie od plaży. Wspiąć się na latarnię morską i spojrzeć na ujście Słupi z góry - stąd widać wyraźnie, gdzie kończy się rzeka, a zaczyna Bałtyk. A potem zejść pod ziemię, do zimnych, wilgotnych korytarzy Bunkrów Blüchera, gdzie cisza brzmi zupełnie inaczej niż na plaży sto metrów dalej.

Informacje praktyczne: latarnia morska w Ustce jest czynna sezonowo i można wejść na jej szczyt za niewielką opłatą. Bunkry Blüchera znajdują się w lesie między Ustką a Rowami (ok. 8 km), zwiedzanie z przewodnikiem, zalecane ciepłe ubranie - w podziemiach jest chłodno przez cały rok. Port rybacki i hale ryb warto odwiedzić przed południem, gdy handel jest w pełnym ruchu.',
  54.5805, 16.8614,
  '/images/ustka.jpg',
  'Latarnia morska w Ustce o zachodzie słońca',
  'center',
  'Karol Szejner',
  'CC BY-SA 4.0',
  7,
  array['Natura','Relaks','Historia'],
  array['Morze'],
  array['Blisko wody'],
  'Do 15 minut pieszo od plaży'
),

(
  'slowinski-park-narodowy',
  'Słowiński Park Narodowy',
  'Pomorze',
  'Europejska pustynia nad Bałtykiem - ruchome wydmy, ukryta w lesie latarnia Czołpino i zatopiony las na plaży.',
  'Piasek skrzypi pod stopami tak samo, jak skrzypiałby na Saharze, a wiatr w każdej godzinie odrobinę zmienia kształt wydmy, na której właśnie stoisz. Słowiński Park Narodowy to miejsce, w którym Polska przestaje przypominać samą siebie - zamiast lasu i plaży jest tu pustynia, prawdziwa, wędrująca, wpisana na listę rezerwatów biosfery UNESCO.

Sercem parku są ruchome wydmy, z których najsłynniejsza - Wydma Łącka - potrafi przesuwać się nawet o kilkanaście metrów rocznie, pochłaniając po drodze fragmenty lasu. Właśnie dlatego w głębi puszczy, z dala od głównych szlaków, stoi samotna latarnia morska w Czołpinie - jedna z najstarszych na polskim wybrzeżu, dziś oddalona od brzegu morza o ponad kilometr, choć budowano ją tuż nad wodą. Morze i piasek tu nie stoją w miejscu.

Co warto poczuć na miejscu: wejść boso na grzbiet Wydmy Łąckiej i poczuć, jak piasek pali w słońcu, a chłodnieje, gdy tylko chmura zasłoni niebo - i rozejrzeć się dookoła, bo z góry widać naraz jezioro Łebsko, las i morze. Odnaleźć na plaży pnie zatopionego, skamieniałego lasu, które wiatr odsłania i zasypuje na przemian, w zależności od pogody ostatnich tygodni. Wspiąć się po wąskich schodach latarni w Czołpinie i spojrzeć na koronę drzew z góry - stamtąd widać, jak bardzo wydma "zjadła" las po drodze.

Informacje praktyczne: wejście do parku z biletem (kasy w Rąbce i Czołpinie), do wydm prowadzi wyznaczona trasa piesza (ok. 3-4 km w jedną stronę z parkingu w Rąbce), zalecane mocne obuwie mimo piasku - trasa jest długa. Latarnia w Czołpinie czynna sezonowo. Warto zaplanować pół dnia - sam spacer po wydmach w pełnym słońcu bez cienia jest wymagający.',
  54.7378, 17.4611,
  '/images/slowinski-park-narodowy.jpg',
  'Wydma Łącka w Słowińskim Parku Narodowym',
  'center',
  'kallerna',
  'CC BY-SA 4.0',
  8,
  array['Natura','Aktywność fizyczna'],
  array['Morze'],
  array['Głusza/las','Blisko wody'],
  null
),

(
  'rowy-jezioro-gardno',
  'Rowy i Jezioro Gardno',
  'Pomorze',
  'Cisza między jeziorem a morzem - windsurfing, wędkarstwo i punkt widokowy na Górze Rowokół.',
  'Między Bałtykiem a Jeziorem Gardno jest zaledwie kilkaset metrów lądu, ale to wystarczy, żeby Rowy stały się miejscem o zupełnie innym rytmie niż sąsiednie kurorty. Z jednej strony fale i wiatr, z drugiej płaska, spokojna toń jeziora - i domek rybacki albo żagiel windsurfingowy jako jedyny znak, że ktoś tu w ogóle mieszka.

Jezioro Gardno, płytkie i rozległe, jest jednym z najlepszych miejsc w Polsce do windsurfingu i kitesurfingu - wiatr wieje tu niemal bez przeszkód, a woda rzadko przekracza metr głębokości, więc nawet początkujący czują się bezpiecznie. Dla wędkarzy to z kolei jedno z bardziej cenionych łowisk na Pomorzu. A tuż nad jeziorem, w lesie, wznosi się Góra Rowokół - najwyższe wzniesienie w okolicy, z którego roztacza się widok jednocześnie na jezioro, morze i wydmy Słowińskiego Parku Narodowego.

Co warto poczuć na miejscu: stanąć na drewnianej wieży widokowej na szczycie Rowokołu i policzyć, ile żywiołów widać naraz - las pod stopami, jezioro po jednej stronie, Bałtyk po drugiej. Popłynąć deską po płytkiej, ciepłej wodzie Gardna, gdy wiatr jest akurat w sam raz. Albo po prostu usiąść wieczorem na wąskim pasie lądu między jeziorem a morzem i posłuchać, jak fale z dwóch stron brzmią zupełnie inaczej.

Informacje praktyczne: wejście na Górę Rowokół (ok. 115 m n.p.m.) to łatwy, oznakowany szlak leśny z parkingu przy drodze do Smołdzina, ok. 20-30 minut w jedną stronę. Wypożyczalnie sprzętu windsurfingowego działają sezonowo nad Jeziorem Gardno w Rowach. Sama wioska Rowy jest niewielka - warto zostawić samochód na parkingu przy wjeździe i dalej poruszać się pieszo.',
  54.6875, 17.1539,
  '/images/rowy-jezioro-gardno.jpg',
  'Wieża widokowa na Górze Rowokół',
  'center',
  'Remik82',
  'CC BY-SA 3.0',
  9,
  array['Natura','Aktywność fizyczna','Relaks'],
  array['Morze'],
  array['Blisko wody','Głusza/las'],
  null
),

(
  'leba',
  'Łeba',
  'Pomorze',
  'Gdzie ląduje historia z dna morza - Muzeum Archeologii Podwodnej z kutrem GDY-18 i Łeba Park z labiryntem roślinnym.',
  'Łeba żyje głównie latem, głośno i tłumnie, ale wystarczy skręcić z głównej promenady, żeby trafić na coś zupełnie innego - kuter GDY-18, wyciągnięty z wody i postawiony na lądzie jak eksponat, który sam siebie opowiada. To właśnie tu, w Muzeum Archeologii Podwodnej, historia Bałtyku ląduje dosłownie na brzegu.

Muzeum gromadzi wraki, kotwice i wyposażenie statków wydobyte z dna Bałtyku - morza, które przez wieki było jednym z najbardziej ruchliwych szlaków handlowych w tej części Europy, a przez to także jednym z największych podwodnych cmentarzysk statków. Kuter rybacki GDY-18, stojący przed muzeum, jest namacalnym dowodem na to, jak blisko wody żyło i wciąż żyje to miasto. Nieopodal, w Łeba Parku, morska historia ustępuje miejsca zabawie - to rozległy park rozrywki z gigantycznym labiryntem roślinnym, w którym łatwiej się zgubić, niż mogłoby się wydawać.

Co warto poczuć na miejscu: stanąć tuż przy kadłubie kutra GDY-18 i wyobrazić sobie, ile razy wypływał on w morze, zanim trafił tutaj, na stały ląd. Przejść przez wnętrze muzeum i zobaczyć przedmioty, które przez dziesięciolecia leżały na dnie, zanim ktoś je stamtąd wydobył. A później zgubić się (naprawdę) w zielonym labiryncie Łeba Parku - to prostsza, ale równie satysfakcjonująca przygoda.

Informacje praktyczne: Muzeum Archeologii Podwodnej działa sezonowo, wejście biletowane, zwiedzanie zajmuje ok. godziny. Łeba Park (z labiryntem roślinnym i innymi atrakcjami) znajduje się na obrzeżach miasta i również działa głównie w sezonie letnim. Centrum Łeby, port i promenada są w zasięgu spaceru od większości noclegów w mieście.',
  54.7597, 17.5536,
  '/images/leba.jpg',
  'Plaża i wydmy w okolicy Łeby',
  'center',
  'Henryk Bielamowicz',
  'CC BY-SA 4.0',
  10,
  array['Historia','Aktywność fizyczna'],
  array['Morze'],
  array['Blisko wody','W centrum miasta'],
  'Do 15 minut pieszo od plaży'
),

(
  'bialogora-krokowa',
  'Białogóra i Krokowa',
  'Pomorze',
  'Stuletni bór i odrestaurowany zamek - rezerwat Babnica, spływ kajakowy Piaśnicą do Dębek i Pałac w Krokowej.',
  'Zanim dotrze się do morza, trzeba najpierw przejechać przez las - a w okolicach Białogóry ten las nie jest przypadkowy. Rezerwat przyrody Babnica chroni fragment starodrzewu sosnowego, jakiego coraz mniej zostało na polskim wybrzeżu: proste, wysokie pnie sięgające po kilkadziesiąt metrów w górę, cisza przerywana tylko szumem koron i, gdzieś w oddali, echem fal.

Przez ten sam krajobraz przepływa Piaśnica - niewielka, spokojna rzeka, którą od lat organizuje się spływy kajakowe kończące się prosto na dzikiej plaży w Dębkach, tam gdzie rzeka wpada do Bałtyku. To jedna z niewielu tras w Polsce, na której kajak dowozi wprost do morza. A kilkanaście kilometrów w głąb lądu, w Krokowej, historia zmienia rejestr - stoi tam odrestaurowany Pałac w Krokowej, dawna siedziba rodu von Krockow, dziś hotel i miejsce, w którym można zajrzeć w przeszłość pomorskiej szlachty.

Co warto poczuć na miejscu: iść przez rezerwat Babnica pieszo, wolno, patrząc w górę na korony starych sosen - to las, który każe zwolnić. Wsiąść do kajaka na Piaśnicy i płynąć z nurtem aż usłyszy się szum fal, zanim jeszcze zobaczy się morze. Stanąć na dziedzińcu Pałacu w Krokowej i skontrastować w głowie ciszę lasu, żywioł rzeki i kamienny spokój rezydencji - wszystko to w promieniu kilkunastu kilometrów.

Informacje praktyczne: rezerwat Babnica ma wyznaczone ścieżki piesze, wstęp wolny. Spływy kajakowe Piaśnicą organizowane są sezonowo przez lokalne wypożyczalnie (start zwykle w okolicach Krokowej lub Białogóry, meta na plaży w Dębkach) - warto rezerwować z wyprzedzeniem w sezonie. Pałac w Krokowej można zwiedzać z zewnątrz bezpłatnie, wnętrza dostępne głównie dla gości hotelowych i przy okazjonalnych wydarzeniach.',
  54.7889, 17.9833,
  '/images/bialogora-krokowa.jpg',
  'Pałac w Krokowej',
  'center',
  'Dawid Galus',
  'CC BY-SA 3.0 pl',
  11,
  array['Natura','Historia','Aktywność fizyczna'],
  array['Morze'],
  array['Głusza/las','Blisko wody'],
  null
),

(
  'rozewie',
  'Latarnia Morska Rozewie',
  'Pomorze',
  'Najstarsza latarnia Polski - budowla nosząca imię Stefana Żeromskiego i muzeum historii latarnictwa.',
  'Na najdalej wysuniętym na północ klifie polskiego wybrzeża stoi latarnia, która świeci od XIV wieku - najpierw jako drewniana konstrukcja z ogniem, potem, od 1822 roku, jako murowana wieża, która stoi tu do dziś. Rozewie to miejsce, w którym technologia nawigacji morskiej i polska literatura spotykają się w jednym punkcie na mapie.

Latarnia nosi imię Stefana Żeromskiego, który spędzał tu czas i czerpał z tego krajobrazu inspirację - w pobliskim domku mieszkalnym latarników mieści się dziś poświęcone mu muzeum. Ale sama wieża jest bohaterką osobną: to jedna z najstarszych czynnych latarni morskich w Polsce, wciąż prowadząca statki po Bałtyku, a jej wnętrze kryje ekspozycję poświęconą historii latarnictwa - od pierwszych ogni sygnałowych po współczesne systemy nawigacyjne.

Co warto poczuć na miejscu: wspiąć się po kręconych schodach na szczyt wieży i wyjść na galeryjkę okalającą latarnię - stamtąd widać klif, morze bez końca po horyzont i, przy dobrej pogodzie, kontur wybrzeża aż po Hel. Zejść do muzeum latarnictwa i zobaczyć soczewki Fresnela, które przez dziesięciolecia skupiały światło widoczne z wielu kilometrów od brzegu. Stanąć w miejscu, gdzie stawał Żeromski, i zrozumieć, dlaczego akurat to wybrzeże tak często pojawia się w jego prozie.

Informacje praktyczne: latarnia i muzeum czynne sezonowo, wejście biletowane, wstęp na galeryjkę wiąże się z wejściem po wąskich, stromych schodach - nie jest to trasa dla osób z problemami z poruszaniem się. Parking znajduje się w pobliżu, dalej trzeba iść pieszo ścieżką przez las nad klifem (ok. 10-15 minut).',
  54.8306, 18.3358,
  '/images/rozewie.jpg',
  'Latarnia morska w Rozewiu',
  'center',
  'HWsnajper',
  'CC BY-SA 3.0 pl',
  12,
  array['Historia','Architektura'],
  array['Morze'],
  array['Głusza/las','Blisko wody'],
  null
),

(
  'jastrzebia-gora-chlapowo',
  'Jastrzębia Góra i Chłapowo',
  'Pomorze',
  'Najwyższe klify, najgłębszy wąwóz - Lisi Jar schodzący prosto do morza i Dolina Chłapowska ("Rudnik") prowadząca na plażę.',
  'Tu wybrzeże przestaje być płaskie. W Jastrzębiej Górze klif wznosi się na ponad 30 metrów nad poziomem morza - to jeden z najwyższych punktów całego polskiego wybrzeża - a w głąb lądu wcina się Lisi Jar, wąwóz, który schodzi tak stromo i tak blisko wody, że jego dno kończy się właściwie na plaży.

Kilka kilometrów dalej, w Chłapowie, krajobraz powtarza ten sam motyw w jeszcze bardziej dramatycznej odsłonie - Dolina Chłapowska, znana lokalnie jako "Rudnik", to głęboki, zalesiony wąwóz o stromych, niemal pionowych zboczach, którym prowadzi ścieżka wprost na dziką plażę pod klifem. To krajobraz zupełnie inny niż łagodne wydmy środkowego wybrzeża - surowszy, bardziej pionowy, jakby morze tutaj musiało się przebić przez ląd, a nie po prostu do niego przylegać.

Co warto poczuć na miejscu: zejść Lisim Jarem od górnej krawędzi klifu aż do linii fal i poczuć, jak zmienia się temperatura i wilgotność powietrza w miarę schodzenia w głąb wąwozu. Stanąć na krawędzi klifu w Jastrzębiej Górze i spojrzeć w dół - to jeden z niewielu widoków w Polsce, gdzie morze wygląda tak daleko w dole. Przejść przez Dolinę Chłapowską ("Rudnik") w milczeniu, bo akustyka wąwozu tłumi dźwięki z zewnątrz, i wyjść nagle na otwartą plażę, jakby las kończył się bez ostrzeżenia.

Informacje praktyczne: zejścia klifowe (Lisi Jar w Jastrzębiej Górze, Dolina Chłapowska w Chłapowie) są strome i po deszczu bywają śliskie - zalecane solidne obuwie. Oba wąwozy są oznakowane i ogólnodostępne, wstęp wolny. Warto sprawdzić stan klifu przed wizytą - erozja bywa intensywna i lokalnie zamyka fragmenty zejść.',
  54.8358, 18.3011,
  '/images/jastrzebia-gora-chlapowo.jpg',
  'Klif w Jastrzębiej Górze',
  'center',
  'Fry72, Karel Frydrýšek',
  'CC BY-SA 4.0',
  13,
  array['Natura','Aktywność fizyczna'],
  array['Morze'],
  array['Głusza/las','Blisko wody'],
  null
);
