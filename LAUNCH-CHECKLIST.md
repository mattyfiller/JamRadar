# JamRadar — Launch Checklist

A literal day-by-day for taking JamRadar from "code on my laptop" to "real riders using it in the wild." Four weeks. Mostly your action, not more code.

---

## Week 1 — foundation

### Day 1 (Monday) — verify + redeploy
- [ ] Open `https://enchanting-douhua-0bf47f.netlify.app` on your laptop. Walk through the app once.
- [ ] Drag `C:\JamRadar` onto `https://app.netlify.com/drop` to push today's changes (landing page, share button, calendar export, deep links, beta banner, 30 events, auth scaffold).
- [ ] Wait ~30 seconds, refresh. The bare URL should now show the **landing page** (with "Open the app" CTA).
- [ ] `[your-url]/JamRadar.html` should open the actual app.
- [ ] Open Chrome DevTools → Application tab → confirm: Manifest valid, Service Worker active, Cache populated.

### Day 2 (Tuesday) — set up Supabase auth
- [ ] Follow [AUTH-SETUP.md](AUTH-SETUP.md) end-to-end. ~30 min in Supabase dashboard.
- [ ] Test: open the app → Profile → tap "Sign in" → use magic link with your own email.
- [ ] Confirm you get the email, tap the link, land back signed-in.
- [ ] In Supabase dashboard → Table editor → `profiles` → confirm your row exists with `state` populated.

### Day 3 (Wednesday) — pick your launch region + audience
- [ ] **Decide your launch sub-region.** Pick ONE: Toronto/GTA, Banff/Canmore, Whistler corridor, Quebec City, Montreal/Laurentides. Smaller is better at this stage.
- [ ] **Make a list of 10–15 specific people** you want as beta testers. Names + how to reach them. Use a Notes file.
  - Snowboard / ski / skate friends
  - Local shop owners you've met
  - Mountain park crew you follow on IG
  - Anyone who'd post events themselves
- [ ] **Pick one feedback channel.** Recommend: a group iMessage thread you're the admin of. Alternatives: Discord server (5 min to set up), or a Tally form linked in your IG bio.

### Day 4 (Thursday) — pick a domain (optional, recommended)
- [ ] Buy `jamradar.app` or similar (~$15/yr at Namecheap, Cloudflare, Porkbun). The `.app` TLD forces HTTPS — perfect for PWAs.
- [ ] In Netlify → Site settings → Domain management → Add custom domain → paste your domain.
- [ ] Netlify gives you DNS instructions (2 records). Set them at your registrar. Propagation: 5 min – 24 hr.
- [ ] Once propagated, your URLs become `https://jamradar.app` (landing) and `https://jamradar.app/JamRadar.html` (app).
- [ ] In Supabase → URL Configuration → update Site URL + Redirect URLs to your custom domain.

### Day 5 (Friday) — content seed
- [ ] Open the app as **Admin** (Profile → Switch to admin mode).
- [ ] Browse to your launch region's mountains/shops/parks online. Add 10–15 fresh real events through CreateEvent in the app.
- [ ] Verify they show on Discover for your region/sports.

---

## Week 2 — closed beta launch

### Day 6 (Monday) — text 5 people
- [ ] Use the [3-line message](OUTREACH.md#section-8) template. **One-on-one** texts, NOT a group blast.
- [ ] Wait. Don't send the next 5 yet.

### Day 7–8 (Tue/Wed) — first responses
- [ ] Whoever responds first: ask them to do one thing — install, open the app, save 1 event.
- [ ] Open Supabase → `profiles` table → look for new rows.
- [ ] Reply to every message within an hour during the workday.

### Day 9 (Thursday) — text the next 5
- [ ] Adjust the message based on what you learned. If first 5 said "what's it for?" → lead with the use case. If they said "the events near me are wrong" → fix that first.
- [ ] Send to next 5 people on your list.

### Day 10 (Friday) — week-1 metrics check
- [ ] In Supabase → `profiles`: how many users? How many have non-default `state`? How many `savedIds.length > 0`?
- [ ] Note anything broken or confusing in a running log.
- [ ] Weekend: ship the 1–2 highest-impact fixes.

---

## End of Week 2 — first decision point

Look at the data and answer **honestly**:

| Signal | What it means | What to do |
|---|---|---|
| 5+ users have saved events, opened multiple times | Real product engagement | Keep going (Week 3+) |
| All users installed but never opened twice | One-time curiosity, no retention | Talk to 3 of them, ask why. Pause the next 5 until you've fixed the issue. |
| Repeat opens but no saves | Discovery works, action doesn't | Friction in the save → reminder loop. Investigate. |
| Active complaints | Something is broken | Stop pushing for new users. Fix first. |

---

## Week 3 — first organizers

### Day 11–12 — organizer outreach
- [ ] Use the [shop / brand IG DM template](OUTREACH.md#section-2). Pick **3 local shops or facilities only.**
- [ ] DM them. If they reply, walk them through Profile → Switch to organizer mode → publish their first event.
- [ ] Personally add the verified-organizer badge for each (Admin → Orgs → Verify).

### Day 13–14 — content rhythm starts
- [ ] Saturday morning routine: spend 60 min adding 10–20 fresh events to the app. Repeat every Saturday going forward.
- [ ] Sources to check weekly:
  - Blue Mountain (or your launch mountain) events page
  - Local park crew Instagrams
  - Underpass / Cumberland skatepark IGs
  - Sweet Skis / Comor / shop newsletters
  - Eventbrite "[your city] snowboarding" search

### Day 15 — first IG / TikTok post
- [ ] Use the [soft launch caption template](OUTREACH.md#section-4).
- [ ] Record 30 seconds of yourself opening the app, scrolling Discover, opening an event, opening the map. Phone-screen recording is fine.
- [ ] Post once. Don't expect virality. Goal: a discoverable artifact when people Google JamRadar.

---

## Week 4 — establish the loop

### Day 16–18 — text the next 5 (you should be at ~15 by now)
- [ ] Round 3 of beta invites. Adapt the message based on weeks 1–2 learnings.
- [ ] Goal: ~15 active beta riders. Not 1500. Not 5. Fifteen.

### Day 19–20 — first mountain reach-out
- [ ] If you have 10+ active riders + 1 organizer using the app, you're ready to email a mountain.
- [ ] Use the [mountain park crew cold email template](OUTREACH.md#section-3).
- [ ] Pick ONE mountain. The biggest one in your launch region. Send to their events / marketing email.
- [ ] Don't send to multiple mountains in week 4. One. Wait for a reply.

### Day 21 — reflect
- [ ] How many active riders? (Supabase profiles)
- [ ] How many events are in the app? Are riders seeing matches?
- [ ] What's the #1 thing testers keep bringing up?
- [ ] Are you spending more time curating events or more time talking to users? It should be the latter.

---

## Month 2 decision point

By end of Week 4 you'll know roughly which scenario you're in:

### Scenario A — real engagement (15+ active weekly riders, 1+ organizer posting)
You have early product–market fit signal. Next moves:
- [ ] Plan Apple App Store submission via PWABuilder (see [DEPLOY.md](DEPLOY.md) Stage 3)
- [ ] Begin the event ingest pipeline ([17_data_ingest_plan.md](jamradar_complete_md_pack/JamRadar/17_data_ingest_plan.md))
- [ ] Consider a co-founder or contractor for ops work

### Scenario B — lukewarm (people install, don't return)
The app works, the audience is wrong, or the value isn't obvious. Next moves:
- [ ] Talk to 5 testers who churned. Ask: what would have made you open it twice?
- [ ] Iterate the onboarding / messaging based on answers
- [ ] Don't add features until you understand what's wrong

### Scenario C — dead (sub-5 active users)
The launch region wasn't right, or the timing was off (mid-summer? off-season?). Options:
- [ ] Try a different region. Whistler scene is more event-dense than Toronto in summer.
- [ ] Wait for snow. Re-launch in November. Use the time to ship event ingest.
- [ ] Pivot the focus — maybe skate-jam-only first?

---

## Things to NOT do during weeks 1–4

- **Don't run paid ads.** You're not ready. Burn rate ≠ engagement.
- **Don't post to LinkedIn.** Wrong audience.
- **Don't apply to Y Combinator / start a startup arc.** Build the thing real first.
- **Don't add features without user requests.** The roadmap is huge ([see all spec docs](jamradar_complete_md_pack/JamRadar)). Resist.
- **Don't announce the "real launch" yet.** Beta is the launch. Stay in beta until weeks 1–4 prove it's worth scaling.
- **Don't compare to Snocountry, OnTheSnow, or other apps.** Their feature sets bloomed over years. You're at week 1.

---

## Required infrastructure (one-time)

If anything breaks, here's where things live:

- **Code**: `C:\JamRadar` on your laptop
- **Hosting**: Netlify dashboard at app.netlify.com
- **Database / auth**: Supabase dashboard for your project
- **Domain (optional)**: your registrar
- **Analytics (later)**: nothing yet — don't add Google Analytics until you have 100 users; it adds complexity for noise

---

## Single most important thing

If you skip the rest of this checklist, do this:

> **Text 10 people the install link this week. Reply to whatever they say. Add events for them every Saturday for 4 weeks.**

That's the loop. Everything else compounds from there.
