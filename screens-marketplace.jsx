// JamRadar — Peer-to-peer gear marketplace.
// Riders sell used boards, jackets, helmets etc. directly to other riders.
// Phase 1: free listings, contact-via-share-sheet, local pickup or DIY ship.
// Phase 2 (Stripe Connect): in-app Checkout with our fee skim — same UI,
// the "Buy now" button just routes through Stripe.

const { SPORTS: _MK_SPORTS } = window.JR_DATA;

const CONDITIONS = [
  { id: 'new',         label: 'New',          sub: 'Never used, tags on' },
  { id: 'like-new',    label: 'Like new',     sub: '1-2 days, no marks' },
  { id: 'used',        label: 'Used',         sub: 'Visible wear, fully working' },
  { id: 'well-loved',  label: 'Well-loved',   sub: 'Cosmetic damage, still rides' },
];

const CATEGORIES = [
  { id: 'snowboard', label: 'Snowboard' },
  { id: 'ski',       label: 'Skis' },
  { id: 'bindings',  label: 'Bindings' },
  { id: 'boots',     label: 'Boots' },
  { id: 'jacket',    label: 'Jacket' },
  { id: 'pants',     label: 'Pants' },
  { id: 'helmet',    label: 'Helmet' },
  { id: 'goggles',   label: 'Goggles' },
  { id: 'skate',     label: 'Skateboard' },
  { id: 'mtb',       label: 'MTB' },
  { id: 'bmx',       label: 'BMX' },
  { id: 'other',     label: 'Other' },
];

const SHIPPING_OPTS = [
  { id: 'local-only', label: 'Local pickup only' },
  { id: 'will-ship',  label: 'Will ship' },
  { id: 'either',     label: 'Either / negotiable' },
];

// ─────────────────────────────────────────────────────────────
// MarketplaceList — browse for-sale items, with filters.
// Rendered as a sub-tab inside the existing GearScreen.
// ─────────────────────────────────────────────────────────────
function MarketplaceList({ prefs, listings, onOpenListing, onSellGear }) {
  const [filterSport, setFilterSport] = React.useState(null);
  const [filterCondition, setFilterCondition] = React.useState(null);

  const filtered = React.useMemo(() => {
    return (listings || [])
      .filter(l => l.status === 'active')
      .filter(l => !filterSport    || l.sport === filterSport)
      .filter(l => !filterCondition || l.condition === filterCondition)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [listings, filterSport, filterCondition]);

  return (
    <div>
      {/* Filter row */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        marginLeft: -18, marginRight: -18,
        paddingLeft: 18, paddingRight: 18, paddingBottom: 8,
      }} className="jr-scroll">
        <PillChip active={!filterSport} onClick={() => setFilterSport(null)} label="All sports" count={listings?.length || 0}/>
        {_MK_SPORTS.map(s => {
          const count = (listings || []).filter(l => l.sport === s.id && l.status === 'active').length;
          if (count === 0) return null;
          return (
            <PillChip key={s.id}
              active={filterSport === s.id}
              onClick={() => setFilterSport(s.id)}
              label={s.label}
              icon={s.icon}
              count={count}/>
          );
        })}
      </div>

      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        marginLeft: -18, marginRight: -18,
        paddingLeft: 18, paddingRight: 18, paddingBottom: 12,
      }} className="jr-scroll">
        {[null, ...CONDITIONS.map(c => c.id)].map(id => {
          const meta = CONDITIONS.find(c => c.id === id);
          const label = id ? meta.label : 'Any condition';
          const on = filterCondition === id;
          return (
            <button
              key={id || 'any'}
              onClick={() => setFilterCondition(id)}
              className="mono"
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '6px 12px', borderRadius: 999, fontSize: 10,
                background: on ? 'var(--accent-soft)' : 'transparent',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                color: on ? 'var(--accent)' : 'var(--fg-muted)',
                letterSpacing: 0.06, textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}
            >{label}</button>
          );
        })}
      </div>

      {/* Listings grid */}
      {filtered.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center', color: 'var(--fg-muted)',
          border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
          fontSize: 13, marginTop: 14,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>◯</div>
          {(listings?.length || 0) === 0
            ? "Nobody's selling gear yet — be the first."
            : "No listings match those filters."}
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          marginTop: 6,
        }}>
          {filtered.map(l => <ListingCard key={l.id} listing={l} onClick={() => onOpenListing?.(l.id)}/>)}
        </div>
      )}

      {/* Sell-your-gear CTA */}
      <button
        onClick={onSellGear}
        className="btn-accent"
        style={{
          width: '100%', marginTop: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 700 }}>+</span>
        Sell your gear
      </button>
    </div>
  );
}

function ListingCard({ listing, onClick }) {
  const photo = (listing.photos && listing.photos[0]) || null;
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer',
      background: 'var(--bg-surface)',
      border: '1px solid var(--line-soft)',
      borderRadius: 'var(--r-md)', overflow: 'hidden',
      padding: 0, color: 'var(--fg)', textAlign: 'left',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        height: 110, position: 'relative',
        background: photo
          ? `center/cover no-repeat url(${photo})`
          : 'linear-gradient(135deg, oklch(0.32 0.03 230) 0%, oklch(0.20 0.02 240) 100%)',
      }}>
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'oklch(0 0 0 / 0.6)', color: 'oklch(1 0 0 / 0.9)',
          padding: '3px 7px', borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 9,
          letterSpacing: 0.08, textTransform: 'uppercase',
        }}>{(CONDITIONS.find(c => c.id === listing.condition) || {}).label || listing.condition}</div>
      </div>
      <div style={{ padding: 10 }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)' }}>
          {listing.brand || (CATEGORIES.find(c => c.id === listing.category) || {}).label || listing.sport}
        </div>
        <div style={{
          fontWeight: 600, fontSize: 12, marginTop: 3, lineHeight: 1.25,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 30,
        }}>{listing.title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
            color: 'var(--accent)',
          }}>${Number(listing.price).toFixed(0)}</span>
          {listing.size ? (
            <span className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)' }}>
              {listing.size}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// ListingDetail — full-screen view of one listing, with contact CTA.
// ─────────────────────────────────────────────────────────────
function ListingDetail({ listingId, onBack, onMarkSold, onWithdraw }) {
  const [listing, setListing] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [photoIndex, setPhotoIndex] = React.useState(0);

  React.useEffect(() => {
    // Resolve loading=false synchronously when there's nothing to fetch —
    // otherwise the screen sits at "Loading…" forever in degraded states.
    if (!listingId || !window.JR_SUPABASE) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await window.JR_SUPABASE
          .from('gear_listings')
          .select('*')
          .eq('id', listingId)
          .single();
        if (!cancelled) {
          if (error) console.warn('[ListingDetail] fetch failed:', error.message);
          setListing(data || null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId]);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line-soft)' }}>
          <button onClick={onBack} aria-label="Back" style={{ appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--fg)', padding: 6 }}>{Icon.back(22)}</button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Loading…</div>
        </div>
      </div>
    );
  }
  if (!listing) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line-soft)' }}>
          <button onClick={onBack} aria-label="Back" style={{ appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--fg)', padding: 6 }}>{Icon.back(22)}</button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Listing not found</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', padding: 32 }}>
          This listing was withdrawn or sold.
        </div>
      </div>
    );
  }

  const photos = listing.photos && listing.photos.length ? listing.photos : [null];
  const conditionMeta = CONDITIONS.find(c => c.id === listing.condition);
  const categoryMeta  = CATEGORIES.find(c => c.id === listing.category);
  const shippingLabel = (SHIPPING_OPTS.find(s => s.id === listing.shipping) || {}).label;

  // Detect authenticated buyer + whether they're the seller themselves.
  const [viewerId, setViewerId] = React.useState(null);
  React.useEffect(() => {
    if (!window.JR_SUPABASE) return;
    window.JR_SUPABASE.auth.getUser().then(({ data }) => {
      setViewerId(data?.user?.id || null);
    });
  }, []);
  const isOwner = viewerId && listing.seller_user_id === viewerId;
  const isAuthed = !!viewerId;

  // Reveal-state for contact info — keeps it from showing in screenshots /
  // anonymous browsers, only authenticated viewers can see it.
  const [revealed, setRevealed] = React.useState(false);

  // Try to detect what kind of contact the seller posted and route the OS to
  // the most useful action.
  const contactKind = React.useMemo(() => {
    const c = (listing.contact_info || '').trim();
    if (!c) return null;
    if (/^@/.test(c) || /instagram|insta/i.test(c)) {
      const handle = c.replace(/^@/, '').split(/[\s,]/)[0];
      return { kind: 'instagram', display: c, openUrl: `https://instagram.com/${handle}` };
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(c)) {
      return { kind: 'email', display: c, openUrl: `mailto:${c}?subject=${encodeURIComponent('Your "' + listing.title + '" on JamRadar')}` };
    }
    if (/^[+\d][\d\s().-]{6,}$/.test(c)) {
      return { kind: 'phone', display: c, openUrl: `sms:${c.replace(/[^\d+]/g, '')}` };
    }
    return { kind: 'text', display: c, openUrl: null };
  }, [listing.contact_info, listing.title]);

  const contactSeller = async () => {
    if (!isAuthed) {
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Sign in to see seller contact info' },
      }));
      return;
    }
    if (!contactKind) {
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: "Seller didn't add contact info" },
      }));
      return;
    }
    setRevealed(true);
    if (contactKind.openUrl) {
      window.open(contactKind.openUrl, '_blank', 'noopener,noreferrer');
    } else {
      try {
        await navigator.clipboard.writeText(contactKind.display);
        window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Contact copied' } }));
      } catch { /* clipboard blocked — the reveal still shows the info on-screen */ }
    }
  };

  const markSold = async () => {
    if (!onMarkSold) return;
    await onMarkSold(listing.id);
    window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Marked sold' } }));
    onBack?.();
  };
  const withdraw = async () => {
    if (!onWithdraw) return;
    await onWithdraw(listing.id);
    window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Listing withdrawn' } }));
    onBack?.();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line-soft)' }}>
        <button onClick={onBack} aria-label="Back" style={{ appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--fg)', padding: 6 }}>{Icon.back(22)}</button>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {listing.title}
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Photo carousel */}
        <div style={{
          height: 300, position: 'relative',
          background: photos[photoIndex]
            ? `center/cover no-repeat url(${photos[photoIndex]})`
            : 'linear-gradient(135deg, oklch(0.32 0.03 230) 0%, oklch(0.20 0.02 240) 100%)',
        }}>
          {photos.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 12, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 6,
            }}>
              {photos.map((_, i) => (
                <button key={i}
                  onClick={() => setPhotoIndex(i)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    width: 8, height: 8, borderRadius: '50%', padding: 0,
                    background: i === photoIndex ? 'oklch(1 0 0)' : 'oklch(1 0 0 / 0.4)',
                    border: 'none',
                  }}/>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 18 }}>
          {/* Price + condition */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28,
              color: 'var(--accent)', letterSpacing: '-0.02em',
            }}>${Number(listing.price).toFixed(2)}</span>
            <span className="bib">{conditionMeta?.label || listing.condition}</span>
          </div>

          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>{listing.title}</h1>

          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 6, letterSpacing: 0.06 }}>
            {[listing.brand, listing.size, categoryMeta?.label].filter(Boolean).join(' · ')}
          </div>

          {/* Stat strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
            <DetailStat label="Seller"   value={listing.seller_name || 'Anonymous'}/>
            <DetailStat label="Location" value={listing.location || '—'}/>
            <DetailStat label="Sport"    value={(window.JR_DATA.SPORTS.find(s => s.id === listing.sport) || {}).label || listing.sport}/>
            <DetailStat label="Shipping" value={shippingLabel || '—'}/>
          </div>

          {listing.description && (
            <p style={{
              margin: '20px 0 0', fontSize: 14, lineHeight: 1.6,
              color: 'var(--fg-muted)', textWrap: 'pretty', whiteSpace: 'pre-wrap',
            }}>{listing.description}</p>
          )}
        </div>
      </div>

      {/* Sticky CTA — different for owner vs buyer */}
      <div style={{
        borderTop: '1px solid var(--line-soft)',
        padding: '14px 18px 30px',
        background: 'oklch(0.18 0.018 240 / 0.92)',
        backdropFilter: 'blur(14px)',
      }}>
        {isOwner ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={markSold} className="btn-accent" style={{ flex: 1 }}>
              Mark sold
            </button>
            <button onClick={withdraw} className="btn-ghost" style={{ flex: 1 }}>
              Withdraw
            </button>
          </div>
        ) : revealed && contactKind ? (
          <div>
            <div className="mono" style={{
              fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
              color: 'var(--fg-dim)', marginBottom: 4,
            }}>Seller contact</div>
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--bg-surface)', border: '1px solid var(--accent)',
              color: 'var(--accent)', fontWeight: 600, fontSize: 14,
              wordBreak: 'break-all',
            }}>{contactKind.display}</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)', marginTop: 6, letterSpacing: 0.06 }}>
              {contactKind.kind === 'email'     ? 'Tapped to open Mail.'
                : contactKind.kind === 'phone'   ? 'Tapped to open Messages.'
                : contactKind.kind === 'instagram' ? 'Tapped to open Instagram.'
                : 'Copied to your clipboard.'}
            </div>
          </div>
        ) : (
          <button
            onClick={contactSeller}
            className="btn-accent"
            style={{ width: '100%' }}
          >
            {isAuthed ? 'Reveal seller contact' : 'Sign in to see contact'}
          </button>
        )}
      </div>
    </div>
  );
}

function DetailStat({ label, value }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: 'var(--bg-surface)',
      border: '1px solid var(--line-soft)',
    }}>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
        color: 'var(--fg-dim)',
      }}>{label}</div>
      <div style={{
        marginTop: 4, fontSize: 13, fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PostListingScreen — sell-gear form.
// ─────────────────────────────────────────────────────────────
function PostListingScreen({ prefs, onPublish, onBack }) {
  const [title, setTitle]               = React.useState('');
  const [description, setDescription]   = React.useState('');
  const [brand, setBrand]               = React.useState('');
  const [size, setSize]                 = React.useState('');
  const [condition, setCondition]       = React.useState('used');
  // Default to a sport the user actually has, but skip "indoor" — used-gear
  // categories don't make sense for indoor training sessions.
  const initialSport = ((prefs?.sports || []).find(s => s !== 'indoor')) || 'snowboard';
  const [sport, setSport]               = React.useState(initialSport);
  const [category, setCategory]         = React.useState('');
  const [price, setPrice]               = React.useState('');
  const [shipping, setShipping]         = React.useState('local-only');
  const [contactInfo, setContactInfo]   = React.useState('');
  const [photos, setPhotos]             = React.useState([]);     // public URLs
  const [uploading, setUploading]       = React.useState(false);
  const [posting, setPosting]           = React.useState(false);

  const priceNum = parseFloat(price);
  const canPublish = title.trim().length > 0
    && Number.isFinite(priceNum) && priceNum > 0
    && photos.length > 0
    && contactInfo.trim().length > 0
    && !uploading && !posting;

  const onPickPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const sb = window.JR_SUPABASE;
    const user = sb && (await sb.auth.getUser()).data?.user;
    if (!sb || !user) {
      window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Sign in first to upload photos' } }));
      return;
    }
    setUploading(true);
    const newUrls = [];
    for (const file of files) {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `${user.id}/listings/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from('posters').upload(path, file, {
          cacheControl: '31536000', upsert: false, contentType: file.type || 'image/jpeg',
        });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = sb.storage.from('posters').getPublicUrl(path);
        newUrls.push(publicUrl);
      } catch (err) {
        console.warn('[PostListing] photo upload failed:', err.message);
      }
    }
    setPhotos(p => [...p, ...newUrls]);
    setUploading(false);
  };

  const removePhoto = (i) => setPhotos(p => p.filter((_, idx) => idx !== i));

  const publish = async () => {
    if (!canPublish) return;
    setPosting(true);
    try {
      await onPublish?.({
        title: title.trim(),
        description: description.trim() || null,
        brand: brand.trim() || null,
        size: size.trim() || null,
        condition,
        sport,
        category: category || null,
        price: priceNum,
        photos,
        location: prefs?.city || null,
        shipping,
        contact_info: contactInfo.trim() || null,
      });
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
        <button onClick={onBack} aria-label="Back" style={{ appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--fg)', padding: 6 }}>{Icon.back(22)}</button>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', flex: 1 }}>
          Sell your gear
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 100px' }}>
        {/* Photos */}
        <FormField label={`Photos${photos.length ? ` (${photos.length})` : ''} — add up to 6, first is the cover`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {photos.map((p, i) => (
              <div key={i} style={{
                position: 'relative', height: 90, borderRadius: 10, overflow: 'hidden',
                background: `center/cover no-repeat url(${p})`,
              }}>
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    position: 'absolute', top: 4, right: 4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'oklch(0 0 0 / 0.7)', color: 'white',
                    border: 'none', fontSize: 14, lineHeight: 1, fontWeight: 700,
                  }}>×</button>
              </div>
            ))}
            {photos.length < 6 && (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 90, borderRadius: 10, cursor: 'pointer',
                background: 'var(--bg-surface)', border: '1px dashed var(--line)',
                color: 'var(--fg-muted)', fontSize: 24,
              }}>
                {uploading ? '…' : '+'}
                <input type="file" accept="image/*" multiple onChange={onPickPhotos}
                  style={{ display: 'none' }}/>
              </label>
            )}
          </div>
        </FormField>

        <FormField label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Burton Custom 158, 2024"
            maxLength={120}
            style={fieldStyle}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Brand">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Burton"
              maxLength={48}
              style={fieldStyle}
            />
          </FormField>
          <FormField label="Size">
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="158 / L / 10.5"
              maxLength={32}
              style={fieldStyle}
            />
          </FormField>
        </div>

        <FormField label="Condition">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CONDITIONS.map(c => {
              const on = condition === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCondition(c.id)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '8px 12px', borderRadius: 999, fontSize: 12,
                    background: on ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    color: on ? 'var(--accent-ink)' : 'var(--fg)',
                    fontFamily: 'var(--font-display)', fontWeight: 500,
                  }}
                >{c.label}</button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Sport">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {_MK_SPORTS.map(s => {
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

        <FormField label="Category">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(c => {
              const on = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="mono"
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '6px 10px', borderRadius: 999, fontSize: 11,
                    background: on ? 'var(--accent-soft)' : 'transparent',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                    color: on ? 'var(--accent)' : 'var(--fg-muted)',
                    letterSpacing: 0.06,
                  }}
                >{c.label}</button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Price (USD)">
          <input
            type="number" inputMode="decimal" step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="299"
            style={fieldStyle}
          />
        </FormField>

        <FormField label="Shipping">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SHIPPING_OPTS.map(o => {
              const on = shipping === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setShipping(o.id)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '8px 12px', borderRadius: 999, fontSize: 12,
                    background: on ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    color: on ? 'var(--accent-ink)' : 'var(--fg)',
                    fontFamily: 'var(--font-display)', fontWeight: 500,
                  }}
                >{o.label}</button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bindings included? Any chips/dings? Year purchased?"
            rows={4}
            style={{ ...fieldStyle, resize: 'vertical', minHeight: 80, fontFamily: 'var(--font-display)' }}
          />
        </FormField>

        <FormField label="How buyers reach you (required)">
          <input
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="@yourhandle, you@email.com, or 555-1234"
            maxLength={140}
            style={fieldStyle}
          />
          <div className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)', marginTop: 4, letterSpacing: 0.06 }}>
            Visible to anyone signed in who opens this listing. Phone, email, or social handle — whatever you'd rather get a message on.
          </div>
        </FormField>

        <p className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', lineHeight: 1.5, marginTop: 12 }}>
          Your listing goes live immediately. Buyers see your contact info and reach out directly. In-app payments with our small fee are coming as Phase 2 — you'll be able to opt in then.
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
          {posting ? 'Publishing…' : uploading ? 'Uploading photos…' : 'Publish listing'}
        </button>
      </div>
    </div>
  );
}

// FormField is defined in screens-detail.jsx + screens-shop.jsx; harmlessly
// redefined here so this file stands alone in case the load order shifts.
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

Object.assign(window, { MarketplaceList, ListingDetail, PostListingScreen });
