alter table public.ecm_email_events add column if not exists broadcast_id text;
create index if not exists ecm_email_events_broadcast_id_idx on public.ecm_email_events(broadcast_id);
