# JamRadar — Affiliate revenue setup

Every gear-deal click from a rider is a missed dollar until we wrap the outbound URL in an affiliate redirect. This is the one-time setup for that. None of these networks charge to join, and approval is usually 1–7 days.

> **TL;DR:** Sign up for **AvantLink + Awin + Impact + Skimlinks** (in that order — AvantLink covers the most action-sports retailers). Then paste each publisher ID into Netlify env vars; the code already knows how to rewrite outbound links.

---

## 1. AvantLink (HIGHEST PRIORITY — most action-sports brands)

**Why first:** AvantLink is _the_ outdoor/action-sports affiliate network in North America. Their merchant catalog includes basically every store we scrape:

| Retailer | Commission | Notes |
|---|---|---|
| **REI** | 5% | 30-day cookie |
| **Tactics.com** | 7–8% | Already in our ingest — instant ROI |
| **Backcountry** | 8% | Bot-blocked for scraping but their links work |
| **Evo** | 7–8% | |
| **Jenson USA** | 8% | Already in our ingest |
| **Christy Sports** | 5–7% | Snow specialists |
| **The House** | 8% | Snow / wake |
| **Skis.com** | 5% | |

**Sign up:** <https://www.avantlink.com/affiliates/become-an-affiliate>
- Tell them you run JamRadar (mobile-first event + gear discovery for action sports). Most action-sports merchants auto-approve action-sports publishers.
- After approval, go to each merchant in your dashboard and click **"Apply for partnership"** — Tactics, REI, Backcountry, Evo, Jenson, Christy Sports. Each merchant approves individually (usually within 24h).
- Find your **Affiliate ID** under **Account → Profile** (looks like `123456`).

---

## 2. Awin (apparel + lifestyle DTC)

**Why second:** Awin has the Shopify-DTC brands AvantLink misses.

| Retailer | Commission |
|---|---|
| **Patagonia** | 8% |
| **Dakine** | 6–8% |
| **Nixon** | 8% |
| **CCS** | 8–10% |
| **The Last Hunt** | 6% |
| **Vans** | 5% |
| **Burton** (some regions) | 8% |

**Sign up:** <https://www.awin.com/us/join>
- $5 refundable deposit (annoying but standard).
- Apply individually to each merchant once your account is live.
- Find your **Publisher ID** under **Account → My Details** (looks like `1234567`).

---

## 3. Impact (Burton + Arc'teryx + Nike + many DTC)

**Why third:** Impact (formerly Impact Radius) handles the brands the others miss.

| Retailer | Commission |
|---|---|
| **Burton** | 8% (primary network) |
| **Arc'teryx** | 6–8% |
| **Nike SB** | 5% |
| **Adidas / Five Ten** | 5–8% |
| **Volcom** | 8% |

**Sign up:** <https://app.impact.com/campaign-promo-signup/Impact.brand?execution=e1s1>
- Free, no deposit.
- Approval is faster than Awin (typically same-day).
- Apply individually to each merchant.

---

## 4. Skimlinks (catch-all auto-rewriter — install last)

**Why last:** Skimlinks doesn't replace the networks above — it catches the long tail. Drop their script on the page and any merchant link Skimlinks recognizes (15,000+ stores) gets auto-rewritten to an affiliate URL with us as the publisher. Commission is split with Skimlinks (75/25 their cut), but it's pure incremental revenue on links we'd otherwise leak.

**Why a non-zero number is better than zero:** even if a rider clicks a Burton link and we haven't joined Impact yet, Skimlinks catches it and we get ~5% instead of 0%.

**Sign up:** <https://skimlinks.com/publishers>
- Approval typically 3–5 days. They'll want a quick site review (the live JamRadar URL is enough).
- Get your **Publisher ID** (looks like `12345X12345`).

---

## 5. Wiring the IDs into JamRadar

Once you have IDs from any of the above, add them as **Netlify environment variables** (Site settings → Build & deploy → Environment):

```
VITE_AVANTLINK_AFFILIATE_ID=123456
VITE_AWIN_PUBLISHER_ID=1234567
VITE_IMPACT_PUBLISHER_ID=1234567
VITE_SKIMLINKS_PUBLISHER_ID=12345X12345
```

Then redeploy. The app's gear-deal click handler reads these and rewrites the outbound URL through the right network before opening it. Until an ID is set the link goes out raw (no commission, no breakage).

You don't need all four to start — even just AvantLink + Skimlinks captures ~80% of click revenue from the current ingest list.

---

## 6. Reporting + tax forms

- All four networks pay monthly via PayPal or direct deposit once you hit their threshold (typically $50–$100).
- All require a W-9 (US) or W-8BEN (international) before they cut the first check. They prompt you in-dashboard.
- Track conversions in each network's dashboard for the first ~30 days to confirm clicks are attributing correctly. If you see "0 clicks" after 100+ outbound link presses in JamRadar analytics, the rewriter wired the wrong ID — open an issue.

---

## 7. What "good" looks like

Realistic Year-1 numbers for an action-sports discovery app:
- ~5% of weekly active users click a gear deal
- ~8% of those convert
- Average order value ~$120
- Blended commission ~7%

So 1,000 weekly active users → ~0.4 sales/day → ~$10/day → ~$300/month. Modest, but it's pure margin on top of the events product, and it scales linearly with WAU.

The bigger affiliate moment is event-related: **lift ticket affiliates** (Liftopia / Ski.com / Snocountry) pay 4–6% on $80–$200 tickets. Once we surface "Get lift tickets" on resort event detail pages, those convert at higher rates than gear because the rider is already committed to going.
