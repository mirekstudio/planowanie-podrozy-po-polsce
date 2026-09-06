-- Uruchom w Supabase Dashboard -> SQL Editor -> New query -> Run

-- Zgłoszenie 06.09 (duplikaty lokalizacji): w tabeli `places` leżą osobne
-- rekordy pojedynczych zabytków/budynków w tej samej miejscowości co już
-- istniejący kuratorski rekord miasta (sprawdzone po współrzędnych
-- wszystkich rekordów):
--   * "Zamek Królewski w Poznaniu"  ~1,2 km od rekordu "poznan"
--   * "Zamek Cesarski w Poznaniu"   ~2,0 km od rekordu "poznan"
--   * "Latarnia Morska Rozewie"     ~2,3 km od "jastrzebia-gora-chlapowo"
-- Każdy ma pełny opis redakcyjny, więc wchodził do suggestBaseCandidates
-- jako NIEZALEŻNY kandydat na bazę wypadową — a to pojedyncza atrakcja w
-- mieście/kurorcie, który jako baza jest już na liście, nie osobna
-- miejscowość z własnym noclegiem. To flaga oceniana ręcznie per rekord
-- (tag "Zamki i Pałace" mają też prawidłowe samodzielne bazy: Gołuchów,
-- Rydzyna, Antonin...). Używana WYŁĄCZNIE przez src/lib/suggestBases.ts —
-- rekord nadal jest atrakcją na mapie, w kategoriach i w promieniu wybranej
-- bazy. Analogiczne do wykluczenia parków narodowych (isProtectedArea).

alter table places
  add column if not exists pojedyncza_atrakcja boolean not null default false;

update places set pojedyncza_atrakcja = true
where slug in (
  'zamek-krolewski-w-poznaniu',
  'zamek-cesarski-w-poznaniu',
  'rozewie'
);
