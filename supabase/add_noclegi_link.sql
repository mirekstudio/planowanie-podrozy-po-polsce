-- Uruchom ten skrypt w Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Zgłoszenie 06.09: tabela noclegi (patrz add_noclegi.sql) nie miała pola
-- na link do oferty/rezerwacji zewnętrznego obiektu — potrzebne dla
-- prawdziwych, komercyjnych obiektów (np. Fly Resort), gdzie appka chce
-- odesłać użytkownika na stronę operatora ("Zobacz ofertę / Zarezerwuj"),
-- w odróżnieniu od naszych własnych, wcześniej dodanych wpisów bez linku
-- (miejsce_powiazane wystarczało, bo nie prowadziły do zewnętrznej oferty).
alter table noclegi add column if not exists link text;
