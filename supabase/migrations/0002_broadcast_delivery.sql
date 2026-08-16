alter table public.ecm_campaigns add column if not exists resend_segment_id text;
alter table public.ecm_campaigns add column if not exists resend_import_id text;
alter table public.ecm_campaigns add column if not exists resend_broadcast_id text;
alter table public.ecm_campaigns drop constraint if exists ecm_campaigns_status_check;
alter table public.ecm_campaigns add constraint ecm_campaigns_status_check check(status in('draft','tested','ready','preparing','sending','sent','failed'));
