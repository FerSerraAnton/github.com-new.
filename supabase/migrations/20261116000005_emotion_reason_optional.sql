-- El emoji se guarda al tocarlo; el porqué se completa después (la app lo exige y avisa si falta).
alter table public.emotion_votes drop constraint if exists emotion_votes_reason_check;
alter table public.emotion_votes add constraint emotion_votes_reason_check check (char_length(reason) <= 600);
