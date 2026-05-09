# JamRadar — Auth Setup Playbook

How to wire JamRadar to Supabase so users can sign in, and their saves/follows/prefs sync across devices.

If you skip this entirely, the app keeps working — it just runs as a single-device experience using `localStorage`. The "Sign in" button on Profile shows a polite "coming soon" message.

This is the **Phase B** work from [18_marketplace_signup_and_kyc_plan.md](jamradar_complete_md_pack/JamRadar/18_marketplace_signup_and_kyc_plan.md).

---

## What you'll have at the end

- Riders can sign in with **email + password**, **email magic link**, **Google**, or **Apple**
- Their saves, going, follows, and prefs travel between devices
- The app still works for not-signed-in (anonymous) users, just like today
- No payment / KYC yet — that's the marketplace phase, deferred

---

## Step 1 — Create a Supabase project (5 min, free)

1. Go to **https://supabase.com** and sign up (Google sign-in works fine).
2. Click **New project**.
3. Pick a name (e.g. `jamradar-prod`), set a strong database password (you won't normally need it; Supabase stashes it for you).
4. Region: pick the one closest to your users. For NA, **US East (N. Virginia)** is a safe default.
5. Plan: **Free**. Plenty for the first ~50,000 monthly active users.
6. Wait ~2 minutes for the project to provision.

## Step 2 — Run the schema

1. In your Supabase project sidebar, click **SQL Editor**.
2. Open `C:\JamRadar\schema.sql` in a text editor → copy the whole file.
3. Paste into the SQL editor → click **Run**.
4. You should see "Success. No rows returned." That's fine.

This creates **two tables**:
- `profiles` — per-user prefs/saves/follows synced across devices
- `events` — the shared event database used by Discover, Map, Saved, etc.

Both tables get row-level security so users can only mutate what they own. Approved events are public-readable so anonymous riders can browse without signing in.

### After running schema, seed the events table

The `events` table starts empty. To copy the 30 seeded events from `data.jsx` into Supabase, do this **once**:

1. Open the deployed app and **sign in** (auth must be configured first — finish the rest of this guide first if you haven't).
2. Open **DevTools** (F12 in Chrome/Edge, or Develop → Show JavaScript Console in Safari).
3. Paste this in the console:
   ```js
   await window.seedEventsToSupabase()
   ```
4. You should see `[JamRadar] Seeded 30 events to Supabase.`
5. Refresh the app. The events you see now come from the database, not from `data.jsx`.

The migration is idempotent — re-running skips events that already match by title + date.

## Step 3 — Get your project URL and anon key

1. In the Supabase sidebar, click the **gear icon** (Project Settings) → **API**.
2. Copy two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting with `eyJ…`. The anon key is **safe to ship to the client** (despite looking like a JWT). RLS policies enforce who can do what.

## Step 4 — Wire the keys into JamRadar

1. Open `C:\JamRadar\supabase-config.jsx`.
2. Fill in the two constants near the top:
   ```js
   const JR_SUPABASE_URL  = 'https://abcdefgh.supabase.co';
   const JR_SUPABASE_ANON = 'eyJhbGc...your-anon-key...';
   ```
3. Save the file.

## Step 5 — Configure the auth providers

In Supabase dashboard → **Authentication** → **Providers**:

### Email (always on)
Enable. Choose whether to require email confirmation:
- **For now (testing)**: turn **off** "Confirm email" — you'll be able to sign in immediately.
- **For real launch**: turn it back **on** so spam accounts can't be created without a real inbox.

### Google
1. Toggle **Google** on.
2. You'll need a **Google Cloud OAuth client ID + secret**:
   - Go to https://console.cloud.google.com → create a project.
   - **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs: paste the **callback URL** Supabase shows you on the Google provider page.
3. Paste the client ID + client secret into Supabase. Save.

### Apple (only required if you ship to App Store)
1. Toggle **Apple** on.
2. Requires an **Apple Developer account** ($99/year — see [DEPLOY.md](DEPLOY.md) Stage 3).
3. Apple's setup is fiddly: you create a Services ID, a Key, configure return URLs. Supabase has a docs link inside the provider page that walks you through it.
4. **You don't need this for the web PWA.** Add it when you ship to the App Store.

### Magic link
Already enabled with Email. No extra setup.

## Step 6 — Add your URLs to the redirect list

Supabase only lets you sign in if the redirect URL matches one in its allow-list.

1. **Authentication → URL Configuration**.
2. **Site URL**: set to your Netlify URL (e.g. `https://enchanting-douhua-0bf47f.netlify.app`).
3. **Redirect URLs**: add both:
   - `https://enchanting-douhua-0bf47f.netlify.app/JamRadar.html`
   - `http://localhost:5173/JamRadar.html` (for local dev)
4. Save.

## Step 7 — Re-deploy

1. Drag your `C:\JamRadar` folder onto **https://app.netlify.com/drop** again — it overwrites the existing site.
2. Wait ~30 seconds.
3. Open the live URL → tap the **You** tab → tap **Sign in**.
4. Try **email magic link** first (simplest test).

If it works, you'll get a sign-in email, tap the link on your phone, and land back in the app signed in. Your "Sign in" button now reads "Sign out" and shows your email.

## Step 8 — Verify multi-device sync

The whole point of this:

1. On device A (signed in), save a couple of events and follow an org.
2. On device B (a different phone, also signed in to the same account), open JamRadar.
3. Within ~1 second the saves and follows show up.

If they don't, check:
- Supabase **Logs → API logs** for failed requests
- Browser console for `[JamRadar]` warnings
- That both devices are on the same account

---

## Troubleshooting

**"Auth not configured" message in the Sign-in screen** — `supabase-config.jsx` constants are still empty. Re-do Step 4, redeploy.

**Sign-in succeeds but saves don't sync** — RLS policies likely missing. Re-run `schema.sql` in the SQL editor.

**Magic link email never arrives** — Supabase free tier rate-limits at 3 emails/hour per recipient. Wait, or set up a custom SMTP provider in Supabase → Project Settings → Auth → SMTP.

**Google sign-in fails with "redirect_uri_mismatch"** — the redirect URL in Google Cloud doesn't match the one Supabase wants. Copy/paste the exact URL Supabase shows in the Google provider page.

**Apple sign-in won't work** — Apple's setup is genuinely the most painful part of this. Skip until you actually need to ship to the App Store.

**RLS blocks all writes** — confirm `auth.uid()` is non-null on the request (i.e., the user is actually signed in client-side). Run a quick test: `select auth.uid();` in the SQL editor while signed in via the Supabase dashboard's "Authentication → Users" view.

---

## What's NOT in this setup yet

These are deferred to later phases ([18_marketplace_signup_and_kyc_plan.md](jamradar_complete_md_pack/JamRadar/18_marketplace_signup_and_kyc_plan.md)):

- **Phone OTP (SMS)** — needed for marketplace tier 2. Requires a Twilio integration in Supabase. Adds cost (~$0.04/SMS).
- **Stripe Connect** — needed for paid marketplace listings. Whole separate setup.
- **Server-side event ingest** — see [17_data_ingest_plan.md](jamradar_complete_md_pack/JamRadar/17_data_ingest_plan.md). Doesn't need auth changes; runs as scheduled jobs.
- **Per-region content** — events live in `data.jsx` for now. Eventually they'll move to a real `events` table.

---

## TL;DR

1. Create Supabase project (free)
2. Run `schema.sql`
3. Copy URL + anon key into `supabase-config.jsx`
4. Enable Email + Google providers; add your Netlify URL to Redirect URLs
5. Re-deploy to Netlify
6. Sign in from the app
7. Run `await window.seedEventsToSupabase()` in DevTools (one-time)

You now have a real multi-device experience.

---

## Optional — turn on automated event ingest

The `ingest/` folder is a Node.js pipeline that scrapes events from Eventbrite, iCal feeds, and Reddit daily and writes them to Supabase. Setup:

1. **Push your code to a GitHub repo** if you haven't already (private is fine — the workflow runs on public + private repos alike).
2. **Get the Supabase service-role key**: Project Settings → API → "service_role" key. **This bypasses RLS** — never paste it in client code, only in GitHub Actions secrets.
3. **Get an Eventbrite Personal Token** (optional but recommended): https://www.eventbrite.com/account-settings/apps → "Create new app" → use the Personal OAuth token.
4. **Add 3 GitHub Actions secrets**: in your repo on github.com → Settings → Secrets and variables → Actions → New repository secret. Add:
   - `SUPABASE_URL` → your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → the service-role key from step 2
   - `EVENTBRITE_TOKEN` → from step 3
5. **Confirm the workflow is wired**: GitHub → Actions tab → you should see "Ingest events" listed.
6. **Test it manually first**: Actions → "Ingest events" → Run workflow → tick `dry_run: true` → Run. Read the logs to confirm everything connects without writing.
7. **First real run**: same flow without `dry_run`. Check the Supabase events table for new rows.
8. From there it runs daily at 11:00 UTC (6am EST) automatically.

When the dedupe scorer finds medium-confidence matches (0.5–0.85), they land in the **Pending Merges** tab on your Admin dashboard. Open the app → Profile → Switch to admin → Merges tab. Review side-by-side → choose Discard / Different / Same → Merge.

Full ingest details + how to add new adapters: [ingest/README.md](ingest/README.md).
