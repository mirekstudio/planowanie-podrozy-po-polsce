alter table places add column if not exists rekomendowane_kempingi text[] not null default '{}';
alter table places add column if not exists wskazowki_kulinarne text;

update places set
  rekomendowane_kempingi = array['Camping Relax (Świnoujście)', 'Camping Tramp (Wolin)'],
  wskazowki_kulinarne = 'W nadmorskich smażalniach i na targu rybnym w Świnoujściu warto spróbować ryb prosto z kutra - świeżej flądry, węgorza czy makreli, smażonych tego samego dnia, gdy trafiły do portu.'
where slug = 'swinoujscie-miedzyzdroje-wolin';

update places set
  rekomendowane_kempingi = array['Camping Baltic (Kołobrzeg)']
where slug = 'kolobrzeg-dzwirzyno';

update places set
  rekomendowane_kempingi = array['Camp Na Wydmie (Łeba)'],
  wskazowki_kulinarne = 'Nad portem w Łebie warto spróbować ryb prosto z kutra - łosoś, dorsz i śledź trafiają tu ze statków rybackich wprost na patelnię w pobliskich smażalniach.'
where slug = 'leba';

update places set
  rekomendowane_kempingi = array['Pole Namiotowe Horyzont (Chłapowo)', 'Alexa Camping (Chłapowo)']
where slug = 'jastrzebia-gora-chlapowo';

update places set
  rekomendowane_kempingi = array['Kempingi w Jastarni', 'Kempingi w Chałupach'],
  wskazowki_kulinarne = 'To dobre miejsce na śledzia po kaszubsku - podawanego z cebulą, jabłkiem i śmietaną, według przepisu przekazywanego na tym wybrzeżu z pokolenia na pokolenie rybackich rodzin.'
where slug = 'wladyslawowo-polwysep-helski';

update places set
  wskazowki_kulinarne = 'Na straganach i w restauracjach Trójmiasta warto spróbować śledzia po kaszubsku - z cebulą, jabłkiem i śmietaną - jednej z najbardziej rozpoznawalnych potraw kuchni kaszubskiej.'
where slug = 'trojmiasto';

update places set
  rekomendowane_kempingi = array['Kempingi w Krynicy Morskiej', 'Kempingi w Piaskach'],
  wskazowki_kulinarne = 'Nad Zalewem Wiślanym warto spróbować węgorza wędzonego tradycyjną metodą - to jeden z najbardziej charakterystycznych smaków tego regionu, znany od pokoleń wśród rybaków znad zalewu.'
where slug = 'mierzeja-wislana';

update places set
  wskazowki_kulinarne = 'Warto spróbować ryb prosto z kutra - w porcie i okolicznych halach rybnych sprzedawane są tego samego dnia, gdy wypłynęły w morze; najczęściej flądra, dorsz i śledź, smażone lub wędzone na poczekaniu.'
where slug = 'ustka';
