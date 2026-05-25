alter table public.flashcards
  add column if not exists deck_id text,
  add column if not exists deck_name text,
  add column if not exists source_file_id uuid references public.files(id) on delete set null,
  add column if not exists last_studied_at timestamptz;

update public.flashcards
set
  deck_id = coalesce(deck_id, 'subject:' || coalesce(subject_id::text, subject_name, 'general')),
  deck_name = coalesce(nullif(deck_name, ''), nullif(subject_name, ''), 'General')
where deck_id is null or deck_name is null or deck_name = '';
