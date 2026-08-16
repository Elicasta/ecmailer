alter table public.ecm_campaigns add column if not exists scheduled_at timestamptz;
alter table public.ecm_campaigns drop constraint if exists ecm_campaigns_status_check;
alter table public.ecm_campaigns add constraint ecm_campaigns_status_check check(status in('draft','tested','ready','preparing','scheduled','sending','sent','failed'));
