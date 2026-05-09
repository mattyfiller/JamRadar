// Page render helper.
// For SPAs and Cloudflare-protected sites, the raw HTML is useless — events
// only render after JS executes and (sometimes) after Cloudflare's JS challenge
// passes. This module gives the rest of the pipeline a single function:
//
//   renderPage(url, { render }) → string of HTML
//
// If `render: true`, we launch a Chromium instance (lazy, cached across calls)
// and return the post-JS HTML. Otherwise we just fetch().
//
// Browser launch is amortised across all render:true URLs in a run. First page
// is slow (~5s); subsequent pages share the browser and average ~2s.

let _browser = null;

const REAL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function getBrowser() {
  if (_browser) return _browser;
  // Lazy-import so unrelated runs don't pay the cost of loading Playwright.
  const { chromium } = await import('playwright');
  _browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  return _browser;
}

export async function renderPage(url, opts = {}) {
  if (!opts.render) {
    // Plain HTTP fetch — fast path.
    const res = await fetch(url, {
      headers: { 'User-Agent': REAL_UA },
      redirect: 'follow',
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.text();
  }

  // Render path: launch (or reuse) a browser, navigate, wait for content.
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent: REAL_UA,
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  // Reduce bot fingerprint a bit — many sites check navigator.webdriver.
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await ctx.newPage();
  try {
    // Tier 1: wait for DOM to be ready. Many SPAs never reach 'networkidle'
    // because of analytics beacons / long-poll WebSockets, so we don't insist.
    await page.goto(url, {
      waitUntil: opts.waitUntil || 'domcontentloaded',
      timeout: opts.timeout || 30_000,
    });
    // Tier 2: opportunistic networkidle wait, but tolerate timeout. Many SPA
    // event lists settle within 2-5s of DCL.
    try {
      await page.waitForLoadState('networkidle', { timeout: opts.idleMs ?? 5000 });
    } catch { /* fine — go ahead with whatever's loaded */ }
    // Tier 3: small settle for lazy-rendered fragments.
    await page.waitForTimeout(opts.settleMs ?? 1500);
    return await page.content();
  } finally {
    await page.close();
    await ctx.close();
  }
}

export async function shutdownRender() {
  if (_browser) {
    try { await _browser.close(); } catch {}
    _browser = null;
  }
}
