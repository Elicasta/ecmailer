alter table public.ecm_imports add column if not exists resend_import_id text;
alter table public.ecm_imports add column if not exists resend_import_status text;
