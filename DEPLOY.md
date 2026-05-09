# JamRadar — Deploy Playbook

This is the click-by-click for getting JamRadar from your `C:\JamRadar` folder onto the public internet, then onto your phone, then (optionally) into the App Store / Play Store / Microsoft Store.

You can do all of this from Windows. No Mac required.

---

## Stage 1 — Get a public HTTPS URL (5–10 minutes, free)

We'll use **Netlify Drop** because it's drag-and-drop with no Git, no CLI, no build config.

### Steps

1. Open **https://app.netlify.com/drop** in your browser.
2. Sign up (free). The fastest way is "Sign up with GitHub" or "Sign up with Google" — no credit card needed.
3. Open File Explorer, navigate to `C:\JamRadar`.
4. **Drag the `JamRadar` folder itself** (the whole folder, not its contents) onto the drop zone.
5. Wait ~30–60 seconds. You'll see a build log scroll, then a green "Site is live" banner.
6. Netlify gives you a URL like `https://random-radar-abc123.netlify.app`. **Copy this URL.**

### Verify it works

7. Open the URL in your laptop's browser. You should see JamRadar render inside the iPhone-frame mock.
8. Open Chrome DevTools → Application tab → Manifest. You should see "JamRadar" with the radar icon and `display: standalone`.
9. Application tab → Service Workers. Should show "service-worker.js — activated and is running."

If those three things look right, you're good for stage 2.

### Optional: rename the URL

10. In Netlify dashboard → Site settings → Change site name → pick something like `jamradar` or `jamradar-app`. URL becomes `https://jamradar.netlify.app`.

### Optional: custom domain

11. If you own a domain (like `jamradar.app`), Site settings → Domain management → Add custom domain. Netlify gives you DNS instructions. HTTPS auto-provisions.

---

## Stage 2 — Install it on your phone (no store, free)

### iPhone

1. Open the Netlify URL in **Safari** (not Chrome — only Safari can install PWAs on iOS).
2. Tap the **Share** button (square with up-arrow).
3. Scroll down → **Add to Home Screen**.
4. Tap **Add** in the top-right.
5. JamRadar icon appears on your home screen. Tap it → opens fullscreen, no Safari chrome.

### Android

1. Open the Netlify URL in **Chrome**.
2. You should get a banner: "Install JamRadar?" Tap **Install**.
3. If you don't see the banner: menu (three dots) → **Install app** or **Add to Home screen**.
4. App appears in your app drawer like any other app.

### Windows (laptop / desktop)

1. Open the URL in **Edge** or **Chrome**.
2. Look for an install icon in the address bar (a monitor with a down-arrow), or menu → **Install JamRadar**.
3. Click **Install**. Gets a Start menu icon, runs in its own window.

At this point you have a working "phone app" experience on every major platform with **zero developer accounts, zero store fees, zero compile time.** Many shipped apps stop here.

---

## Stage 3 — Get into the actual stores (when ready)

This costs money and time. **Don't do this until your prototype has been used by real people and you know it's worth shipping.**

### Cost summary

| Store | Account fee | Mac required? |
|---|---|---|
| Microsoft Store | $19 one-time | No |
| Google Play | $25 one-time | No |
| Apple App Store | $99 / year | No (we'll use a cloud Mac) |

### Tool: PWABuilder.com

PWABuilder is Microsoft's free tool that turns your PWA URL into store-ready packages. Web-based, runs on any browser, no install.

1. Go to **https://www.pwabuilder.com**.
2. Paste your Netlify URL into the input field. Click **Start**.
3. PWABuilder analyzes your manifest, service worker, and icons. You should see green checkmarks (we've already set everything up).
4. Click **Package for Stores**.
5. Choose Windows / Android / iOS. PWABuilder generates the package and provides submission instructions.

### Microsoft Store

1. PWABuilder → Package for Stores → Windows → generates a `.msixbundle`.
2. Sign up for **Microsoft Partner Center** at https://partner.microsoft.com (~$19 one-time, sign up with the same Microsoft account you use for Outlook/Xbox).
3. Create a new submission, upload the `.msixbundle`. Fill out the listing (description, screenshots, age rating).
4. Submit for review. Approval typically takes 1–3 days.

### Google Play Store

1. PWABuilder → Package for Stores → Android → generates an `.aab`.
2. Sign up for **Google Play Console** at https://play.google.com/console (~$25 one-time).
3. Create a new app, upload the `.aab`. Fill out the listing.
4. Submit for review. Typical wait: 1–7 days.

### Apple App Store

This is the trickiest because Apple wants the iOS build to come from a Mac. We work around it with PWABuilder's cloud build:

1. Sign up for **Apple Developer Program** at https://developer.apple.com (~$99/year, requires an Apple ID).
2. Wait for approval (1–2 days).
3. PWABuilder → Package for Stores → iOS. PWABuilder uses cloud Macs to build the `.ipa` for you and walks you through generating the certificates.
4. Open **App Store Connect** at https://appstoreconnect.apple.com (web-based, works on Windows). Create a new app entry.
5. Upload the `.ipa`. PWABuilder gives you the exact upload command (uses a tool called **Transporter** which has a Windows version, or use Apple's web upload).
6. Fill out the App Store listing in App Store Connect.
7. Submit for review. Apple is the slowest and pickiest — typical wait 1–5 days, occasional rejection on first submit.

**Heads up on Apple:** they're stricter about reviewing PWA-wrapped apps than fully native ones. PWABuilder packages are designed to clear Apple's "minimum functionality" rule, but the first review can still bounce. Common fixes: respond to the reviewer's note, tweak the description, resubmit. Most apps clear it within 1–2 attempts.

---

## Stage 4 — Updating your app after deploy

Once it's live, here's how updates flow:

1. You edit a file in `C:\JamRadar` (e.g., add a feature).
2. Drag the folder onto Netlify Drop again — it overwrites the previous deploy. (Or set up Git so it auto-deploys; see "Auto-deploy" below.)
3. **Already-installed users** don't have to reinstall. Their service worker checks for updates on next launch and pulls the new version automatically. The cache headers we set in `netlify.toml` ensure the SW can see updates.
4. **Store users** (after Stage 3): PWA-wrapped apps update via the PWA mechanism *for the web content*, but native shell updates require resubmitting to the store. Most updates won't need a resubmit.

### Auto-deploy (recommended once it's working)

Netlify can pull from a Git repo and redeploy whenever you push. Setup:

1. Make a free GitHub account if you don't have one.
2. Push the `C:\JamRadar` folder to a new GitHub repo (Netlify guides you).
3. In Netlify dashboard → Site settings → Build & deploy → Link to repository.
4. Now every `git push` triggers a deploy. You can edit on Windows, push, see it live in 30 seconds.

---

## What's already done in the code

Your `C:\JamRadar` folder has everything needed:

- `manifest.webmanifest` — PWA metadata, icon set, shortcuts, categories.
- `service-worker.js` — offline cache for app shell + CDN deps.
- `icon.svg` + `icon-maskable.svg` — radar logo, both regular and Android-adaptive variants.
- `offline.html` — pretty fallback when there's no connection.
- `netlify.toml` — cache headers tuned for PWA updates.
- `robots.txt` — search engines welcome.
- `DEPLOY.md` — this file.

---

## Quick troubleshooting

- **"Add to Home Screen" doesn't show in Safari** — make sure you're in Safari (not Chrome on iOS), and on the actual deployed URL (not localhost over WiFi unless it's HTTPS).
- **App opens with browser chrome instead of fullscreen** — uninstall and reinstall. Sometimes iOS caches the old manifest.
- **"Service worker registration failed"** — Netlify auto-serves over HTTPS, so this should just work. If you're testing on `localhost` or LAN-IP HTTP, that's the issue.
- **PWABuilder gives a low score** — make sure your Netlify URL is up and the manifest/SW are reachable. Open the URL in incognito to confirm it loads from scratch.

---

## TL;DR

1. **Today**: drag `C:\JamRadar` onto https://app.netlify.com/drop → get URL.
2. **Today**: install on your phone via Safari Share → Add to Home Screen.
3. **Later**: PWABuilder.com → upload to stores → live in major app stores.

That's it.
