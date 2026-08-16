-- Uruchom w Supabase Dashboard -> SQL Editor -> New query -> Run

alter table places add column if not exists typ_regionu text[] not null default '{}';
alter table places add column if not exists blizkosc_atrakcji text;
alter table places add column if not exists otoczenie text[] not null default '{}';

-- Oznaczenie istniejących miejsc tam, gdzie te wymiary mają sens.
-- Ląd nie pasuje jednoznacznie do żadnej wartości typ_regionu
-- (Morze/Góry/Jeziora/Miasta), więc zostaje bez tego tagu.
update places set
  typ_regionu = array['Jeziora'],
  otoczenie = array['Blisko wody']
where slug = 'biskupin';

update places set
  typ_regionu = array['Miasta'],
  otoczenie = array['W centrum miasta'],
  blizkosc_atrakcji = 'W centrum starego miasta'
where slug = 'gniezno';

update places set
  typ_regionu = array['Miasta'],
  otoczenie = array['W centrum miasta'],
  blizkosc_atrakcji = 'W centrum starego miasta'
where slug = 'poznan';

update places set
  otoczenie = array['Blisko wody']
where slug = 'lad';

update places set
  typ_regionu = array['Jeziora'],
  otoczenie = array['Blisko wody']
where slug = 'kruszwica';

update places set
  typ_regionu = array['Jeziora'],
  otoczenie = array['Blisko wody']
where slug = 'ostrow-lednicki';
