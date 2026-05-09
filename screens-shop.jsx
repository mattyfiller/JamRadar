// JamRadar — Shop self-signup dashboards.
// Shop accounts (prefs.accountType === 'shop') see ShopDashboard instead of
// the rider Discover. They can post gear deals via PostDealScreen, which
// inserts into gear_deals with status='pending' for admin review.

const { SPORTS: _SH_SPORTS } = window.JR_DATA;

// ───────────── SHOP DASHBOARD ─────────────
function ShopDashboard({ prefs, onPostDeal, onBack }) {
  const SHOP_NAME = prefs?.shopName?.trim() || 'Your shop';
  const SHOP_INITIALS = SHOP_NAME.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'JR';

  // Pull this shop's deals from Supabase. We filter client-side because the
  // RLS policy already lets owners read their own pending rows.
  const [myDeals, setMyDeals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!window.JR_SUPABASE_READY) { setLoading(false); return; }
    try {
      const sb = window.JR_SUPABASE;
      const user = (await sb.auth.getUser()).data?.user;
      if (!user) { setLoading(false); return; }
      const { data, error } = await sb
        .from('gear_deals')
        .select('*')
        .eq('shop_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) console.warn('[ShopDashboard] fetch failed:', error.message);
      setMyDeals(data || []);
    } catch (e) {
      console.warn('[ShopDashboard] fetch threw:', e.message);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const pending  = myDeals.filter(d => d.status === 'pending');
  const approved = myDeals.filter(d => d.status === 'approved');

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button onClick={onBack} style={{
            appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent',
            color: 'var(--fg)', padding: 0,
          }}>{Icon.back(20)}</button>
          <div className="mono" style={{
            fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
            color: 'var(--fg-dim)',
          }}>Shop</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
          }}>{SHOP_INITIALS}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
              {SHOP_NAME}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
              {prefs?.shopWebsite ? prefs.shopWebsite.replace(/^https?:\/\//, '') + ' · ' : ''}
              {myDeals.length} deal{myDeals.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <KPICard label="Live deals" value={String(approved.length)} delta={`${pending.length} pending`}/>
          <KPICard label="Total posted" value={String(myDeals.length)} delta="all time" up/>
        </div>

        <SectionLabel kicker="Live" label="Your deals" sub={`${myDeals.length} total`}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {loading ? (
            <div className="mono" style={{
              padding: 24, textAlign: 'center', color: 'var(--fg-muted)',
              border: '1px dashed var(--line)', borderRadius: 'var(--r-md)', fontSize: 11,
            }}>Loading…</div>
          ) : myDeals.length === 0 ? (
            <div style={{
              padding: 24, textAlign: 'center', color: 'var(--fg-muted)',
              border: '1px dashed var(--line)', borderRadius: 'var(--r-md)', fontSize: 13,
            }}>
              No deals yet — tap <b>Post deal</b> to publish your first.
            </div>
          ) : myDeals.map(d => (
            <ShopDealRow key={d.id} deal={d}/>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button onClick={onPostDeal} style={{
        position: 'absolute', bottom: 24, right: 18,
        appearance: 'none', cursor: 'pointer',
        background: 'var(--accent)', color: 'var(--accent-ink)',
        width: 56, height: 56, borderRadius: '50%',
        border: 'none', boxShadow: '0 4px 16px oklch(0 0 0 / 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 700,
      }}>+</button>
    </div>
  );
}

function ShopDealRow({ deal }) {
  const isPending = deal.status === 'pending';
  return (
    <div style={{
      padding: 12, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)',
      border: '1px solid var(--line-soft)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 13, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{deal.title}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 3 }}>
          ${Number(deal.price).toFixed(2)}
          {deal.original ? <> <span style={{ textDecoration: 'line-through' }}>${Number(deal.original).toFixed(2)}</span></> : null}
          {deal.off_pct ? ` · −${deal.off_pct}%` : ''}
        </div>
      </div>
      <span className="mono" style={{
        fontSize: 9, padding: '4px 8px', borderRadius: 999,
        background: isPending ? 'oklch(0.32 0.08 60 / 0.3)' : 'var(--accent-soft)',
        color:      isPending ? 'oklch(0.85 0.15 75)' : 'var(--accent)',
        letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 700,
      }}>{isPending ? 'Pending' : 'Live'}</span>
    </div>
  );
}

// ───────────── POST DEAL SCREEN ─────────────
function PostDealScreen({ prefs, onPublish, onBack }) {
  const [title, setTitle]         = React.useState('');
  const [price, setPrice]         = React.useState('');
  const [original, setOriginal]   = React.useState('');
  const [regLink, setRegLink]     = React.useState('');
  const [sport, setSport]         = React.useState((prefs?.shopSports?.[0]) || 'snowboard');
  const [posting, setPosting]     = React.useState(false);

  const priceNum    = parseFloat(price);
  const originalNum = parseFloat(original);
  const offPct = (Number.isFinite(priceNum) && Number.isFinite(originalNum) && originalNum > priceNum)
    ? Math.round((1 - priceNum / originalNum) * 100)
    : null;

  const canPublish = title.trim().length > 0
    && Number.isFinite(priceNum) && priceNum > 0
    && !posting;

  const publish = async () => {
    if (!canPublish) return;
    setPosting(true);
    const deal = {
      title:    title.trim(),
      price:    priceNum,
      original: Number.isFinite(originalNum) ? originalNum : null,
      off_pct:  offPct,
      sport,
      reg_link: regLink.trim() || null,
      shop:     prefs?.shopName?.trim() || 'Shop',
    };
    try {
      await onPublish?.(deal);
    } finally {
      setPosting(false);
    }
  };

  const fieldStyle = {
    width: '100%', background: 'var(--bg-surface)',
    border: '1px solid var(--line-soft)', borderRadius: 10,
    padding: '12px 14px', color: 'var(--fg)', fontSize: 15,
    fontFamily: 'var(--font-display)', fontWeight: 500,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line-soft)' }}>
        <button onClick={onBack} style={{
          appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent',
          color: 'var(--fg)', padding: 6,
        }}>{Icon.back(22)}</button>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', flex: 1 }}>
          Post deal
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 100px' }}>
        <FormField label="Product title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Burton Custom 158 — 2026"
            maxLength={120}
            style={fieldStyle}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Sale price">
            <input
              type="number" inputMode="decimal" step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="299"
              style={fieldStyle}
            />
          </FormField>
          <FormField label="Original price">
            <input
              type="number" inputMode="decimal" step="0.01"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="399"
              style={fieldStyle}
            />
          </FormField>
        </div>
        {offPct ? (
          <div className="mono" style={{
            fontSize: 11, color: 'var(--accent)',
            marginTop: -10, marginBottom: 14, paddingLeft: 4,
          }}>−{offPct}% off</div>
        ) : null}

        <FormField label="Sport">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {_SH_SPORTS.map(s => {
              const on = sport === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSport(s.id)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '8px 12px', borderRadius: 999, fontSize: 12,
                    background: on ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    color: on ? 'var(--accent-ink)' : 'var(--fg)',
                    fontFamily: 'var(--font-display)', fontWeight: 500,
                  }}
                >{s.label}</button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Product link (optional)">
          <input
            value={regLink}
            onChange={(e) => setRegLink(e.target.value)}
            placeholder="https://yourshop.com/product"
            type="url"
            autoComplete="off"
            style={fieldStyle}
          />
        </FormField>

        <p className="mono" style={{
          fontSize: 10, color: 'var(--fg-dim)', lineHeight: 1.5, marginTop: 12,
        }}>
          Deals go through a quick admin review (usually within a day) before showing
          on Discover and the Gear tab. You'll see the status on your dashboard.
        </p>
      </div>

      <div style={{
        borderTop: '1px solid var(--line-soft)',
        padding: '14px 18px 30px',
        background: 'oklch(0.18 0.018 240 / 0.92)',
        backdropFilter: 'blur(14px)',
      }}>
        <button
          onClick={publish}
          disabled={!canPublish}
          className="btn-accent"
          style={{
            width: '100%',
            opacity: canPublish ? 1 : 0.4,
            cursor: canPublish ? 'pointer' : 'not-allowed',
          }}
        >
          {posting ? 'Posting…' : 'Submit for review'}
        </button>
      </div>
    </div>
  );
}

// Reused from screens-detail.jsx — defined here too so this file stands alone.
// (Both files registered onto window in app load order; the second registration wins,
// but they're identical.)
function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="mono" style={{
        fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
        color: 'var(--fg-dim)', marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

Object.assign(window, { ShopDashboard, PostDealScreen });
