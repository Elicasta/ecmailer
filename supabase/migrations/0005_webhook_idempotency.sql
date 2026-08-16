alter table public.ecm_email_events add column if not exists webhook_id text;
create unique index if not exists ecm_email_events_webhook_id_unique on public.ecm_email_events(webhook_id);
