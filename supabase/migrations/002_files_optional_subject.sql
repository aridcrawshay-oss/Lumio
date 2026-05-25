alter table public.files
  alter column subject_id drop not null;

alter table public.files
  drop constraint if exists files_subject_id_fkey;

alter table public.files
  add constraint files_subject_id_fkey
  foreign key (subject_id)
  references public.subjects(id)
  on delete set null;
