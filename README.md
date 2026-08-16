# EC Mailer

Private marketing campaign mailer for EC Creative Studios.

EC Mailer imports Pixieset contacts into Supabase, syncs them to a dedicated Resend marketing segment, creates branded HTML campaigns, supports test sends and scheduled/immediate Broadcasts, tracks delivery events, and permanently suppresses unsubscribes, bounces, complaints, and provider suppressions.

## Architecture

- **Next.js 16**: private admin UI and server routes
- **Supabase**: source of truth for contacts, campaigns, recipient snapshots, imports, and event history
- **Resend Broadcasts**: marketing delivery and provider-level unsubscribe state
- **Vercel**: app hosting
- **GoDaddy DNS**: EC Creative Studios DNS records only

Supabase owns the durable internal record. Resend owns marketing delivery and its global broadcast unsubscribe state. EC Mailer mirrors important provider events back into Supabase.

## What is built

- HTTP Basic admin lock with fail-closed behavior
- Pixieset CSV import with lowercase email normalization and in-file deduplication
- Supabase upsert that does not overwrite existing local marketing suppression status
- Resend Contact Import sync to one dedicated EC marketing segment
- Branded, table-based HTML email renderer with plain-text fallback
- Required physical business address in every marketing email
- Managed Resend Broadcast unsubscribe link
- Signed EC Mailer unsubscribe fallback that also updates Resend
- Test send requirement before a live/scheduled Broadcast can be submitted
- Typed `SEND` confirmation plus a database campaign lock against double submission
- Immediate and scheduled Broadcast delivery
- Verified Resend webhook ingestion
- Idempotent webhook storage using the Svix webhook ID
- Automatic suppression for unsubscribes, bounces, complaints, and provider suppression events
- Campaign analytics for delivered, opened, clicked, bounced, and complained recipients
- Campaign recipient snapshots for auditability
- Row Level Security enabled on all public EC Mailer tables; public client roles receive no table grants

## Database setup

Create a **dedicated Supabase project for EC Mailer**. Do not put EC client records into an unrelated application database.

Run the migrations in order:

```text
supabase/migrations/0001_ecmailer.sql
supabase/migrations/0002_broadcast_delivery.sql
supabase/migrations/0003_resend_sync.sql
supabase/migrations/0004_event_attribution.sql
supabase/migrations/0005_webhook_idempotency.sql
supabase/migrations/0006_scheduling.sql
```

Then set:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

The secret key is server-only and must never be exposed to browser code.

## Resend setup

Use a dedicated EC Creative Studios sending identity. Recommended:

```text
Sending domain: mail.eccreativestudios.com
From: EC Creative Studios <hello@mail.eccreativestudios.com>
```

Create one permanent Resend segment:

```text
EC Creative Studios Master
```

Set its ID as `RESEND_SEGMENT_ID`.

Create a Resend API key for the app. Prefer the narrowest permission that still supports contacts/imports, Broadcasts, and webhook verification for this workflow.

Configure a webhook endpoint after the production app URL exists:

```text
https://mailer.eccreativestudios.com/api/webhooks/resend
```

Subscribe to the email delivery/engagement events used by the dashboard plus `contact.updated` so Resend unsubscribe changes can be mirrored into Supabase.

Set:

```env
RESEND_API_KEY=
RESEND_SEGMENT_ID=
RESEND_FROM="EC Creative Studios <hello@mail.eccreativestudios.com>"
RESEND_REPLY_TO=
RESEND_WEBHOOK_SECRET=
```

## GoDaddy DNS

Do **not** replace the domain nameservers and do **not** change the root mailbox MX records just to enable EC Mailer.

After `mail.eccreativestudios.com` is created in Resend, Resend will show the exact DNS records required for domain verification. Add those exact records in GoDaddy DNS. Keep the sending subdomain isolated from the root business mailbox configuration.

Do not invent or reuse records from another Resend domain. DKIM values are specific to the EC sending domain.

## Vercel setup

Create a Vercel project from `Elicasta/ecmailer` and deploy `main`.

Recommended production app domain:

```text
mailer.eccreativestudios.com
```

Set every value from `.env.example` in the Vercel production environment. Generate long random values for `ADMIN_PASSWORD` and `UNSUBSCRIBE_SECRET`.

Required environment variables:

```env
NEXT_PUBLIC_APP_URL=https://mailer.eccreativestudios.com
ADMIN_USER=
ADMIN_PASSWORD=
BUSINESS_POSTAL_ADDRESS=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
RESEND_API_KEY=
RESEND_SEGMENT_ID=
RESEND_FROM="EC Creative Studios <hello@mail.eccreativestudios.com>"
RESEND_REPLY_TO=
UNSUBSCRIBE_SECRET=
RESEND_WEBHOOK_SECRET=
```

`BUSINESS_POSTAL_ADDRESS` is deliberately required before test or live campaign delivery.

## First production import

1. Open **Contacts**.
2. Import the current Pixieset CSV.
3. EC Mailer normalizes and deduplicates the file into Supabase.
4. When Resend is configured, the same import is submitted to the dedicated EC marketing segment.
5. Before a Broadcast is submitted, EC Mailer checks the latest Resend Contact Import and refuses to send while that import is still incomplete or failed.

The Pixieset `Type` field is stored as metadata only. It does not determine campaign eligibility.

Eligibility is controlled by `marketing_status`:

```text
eligible
unsubscribed
bounced
complained
suppressed
```

Re-importing a CSV does not overwrite this local status.

## Campaign flow

```text
DRAFT
  -> test send
TESTED
  -> typed SEND + final confirmation
PREPARING
  -> Resend audience import verified
  -> Broadcast submitted
SCHEDULED or SENT
```

A campaign with a future schedule is submitted to Resend with that timestamp. A campaign without a schedule is submitted immediately.

The campaign is locked before provider submission. Repeated clicks cannot successfully acquire the same send state twice.

## Unsubscribe behavior

Production Broadcast emails use Resend's managed unsubscribe URL.

When Resend reports a contact as unsubscribed, EC Mailer marks that address `unsubscribed` in Supabase. Bounces, complaints, and provider suppressions are also persisted so future campaigns can exclude them in the internal audience state.

The signed `/unsubscribe` route exists as a fallback and for non-Broadcast use. It updates Supabase first and then mirrors the unsubscribe preference to Resend.

## Current activation blockers

At the time this repository was built, the connected accounts have two external plan limits:

1. **Supabase**: the free organization already has two active projects, so a dedicated `ecmailer` project cannot be created until one existing project is paused or the account is upgraded.
2. **Resend**: the current plan has reached both its domain and segment limits. EC Mailer needs one EC sending domain and one dedicated EC marketing segment before production sending can be enabled.

The app should not reuse the existing Apostolic Guide database, sending domain, or marketing segments to bypass those limits.

## Production activation order

1. Free a Supabase project slot or upgrade Supabase.
2. Create the dedicated `ecmailer` Supabase project and apply migrations.
3. Raise the Resend domain/segment limits.
4. Create `mail.eccreativestudios.com` in Resend.
5. Add the exact Resend DNS records in GoDaddy and verify the domain.
6. Create `EC Creative Studios Master` in Resend.
7. Create/configure the Resend API key.
8. Create the Vercel project and set environment variables.
9. Attach `mailer.eccreativestudios.com` to Vercel.
10. Configure the verified Resend webhook against the production URL.
11. Import the Pixieset CSV.
12. Send a real test email to an EC-owned inbox.
13. Verify desktop/mobile rendering, CTA, reply-to, and unsubscribe.
14. Only then submit the 1,303-contact campaign.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Production check:

```bash
npm run build
npm start
```

Never commit `.env`, `.env.local`, API keys, Supabase secret keys, webhook secrets, or administrator passwords.
