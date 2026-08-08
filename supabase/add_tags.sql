-- Uruchom w Supabase Dashboard -> SQL Editor -> New query -> Run

alter table places add column if not exists tags text[] not null default '{}';

update places set tags = array['Historia','Natura','Aktywność fizyczna'] where slug = 'biskupin';
update places set tags = array['Historia','Architektura'] where slug = 'gniezno';
update places set tags = array['Architektura','Historia','Relaks'] where slug = 'poznan';
update places set tags = array['Architektura','Relaks','Aktywność fizyczna'] where slug = 'lad';
update places set tags = array['Historia','Natura','Relaks'] where slug = 'kruszwica';
update places set tags = array['Historia','Natura'] where slug = 'ostrow-lednicki';
