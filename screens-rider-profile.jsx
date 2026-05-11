// JamRadar — Rider profile (public view of another rider).
// Sister to OrgProfile but for individuals. Wave button is a stub until the
// real auth + DM channel ships (see 18_marketplace_signup_and_kyc_plan.md).

const { SPORTS: _RP_SPORTS } = window.JR_DATA;

function RiderProfile({ riderId, events, savedIds, isGuest, onOpenEvent, onSave, onBack }) {
  const seedRider = (window.JR_DATA.RIDERS || []).find(r => r.id === riderId);
  const [rider, setRider] = React.useState(seedRider || null);
  const [loading, setLoading] = React.useState(!seedRider && riderId?.startsWith('sb:'));

  // If this is a real (Supabase-sourced) rider id, fetch fresh from public_riders.
  React.useEffect(() => {
    if (!riderId?.startsWith('sb:')) return;
    if (!window.JR_FETCH_RIDERS) { setLoading(false); return; }
    let cancelled = false;
    window.JR_FETCH_RIDERS().then(list => {
      if (cancelled) return;
      const found = list.find(r => r.id === riderId);
      if (found) setRider(found);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [riderId]);

  // Loading and not-found both need a real screen instead of returning null,
  // which previously left users staring at a blank page with no way back.
  if (!rider) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line-soft)' }}>
          <BackButton onClick={onBack}/>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
            {loading ? 'Loading rider…' : 'Rider not found'}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-muted)', fontSize: 13, padding: 32, textAlign: 'center' }}>
          {loading
            ? 'Fetching profile from the server…'
            : "This rider isn't open to ride right now or no longer exists."}
        </div>
      </div>
    );
  }

  const sportLabels = (rider.sports || [])
    .map(id => _RP_SPORTS.find(s => s.id === id)?.label)
    .filter(Boolean)
    .join(', ');

  // Real "wave" today: open the system share sheet with a pre-written intro.
  // The recipient has been pseudonymous via public_riders (no email exposed),
  // so we share via the OS share API and let the user pick how to reach out
  // (Messages, WhatsApp, Mail, copy link). Falls back to clipboard.
  const wave = async () => {
    // The share text always uses first name only — feels more natural
    // regardless of whether the viewer is a guest.
    const firstName = (rider.name || '').split(/\s+/)[0] || 'there';
    const text = `Hey ${firstName} — caught your profile on JamRadar. Want to ride sometime?`;
    const shareUrl = (typeof location !== 'undefined' ? location.origin : 'https://jamradar.netlify.app') + '/?rider=' + encodeURIComponent(riderId);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'JamRadar', text, url: shareUrl });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;   // user cancelled — silent
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Wave message copied — paste anywhere' },
      }));
    } catch {
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Could not open share sheet' },
      }));
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Hero */}
      <div className="poster-ph" style={{
        position: 'relative', height: 200,
        background: `linear-gradient(135deg, oklch(0.40 0.10 ${rider.color}) 0%, oklch(0.18 0.02 240) 100%)`,
      }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
        }}>
          <BackButton onClick={onBack} variant="pill"/>
        </div>

        <div style={{
          position: 'absolute', left: 18, right: 18, bottom: 18,
          display: 'flex', alignItems: 'flex-end', gap: 14,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, oklch(0.65 0.18 ${rider.color}), oklch(0.35 0.05 240))`,
            border: '3px solid var(--bg-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
            color: 'white',
            boxShadow: '0 4px 16px oklch(0 0 0 / 0.4)',
          }}>{rider.initials}</div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 24, letterSpacing: '-0.025em', lineHeight: 1.05,
              color: 'white', textShadow: '0 2px 18px oklch(0 0 0 / 0.5)',
            }}>{
              // Guests see first name only; signed-in viewers see full display name.
              isGuest
                ? ((rider.name || '').split(/\s+/)[0] || 'Rider')
                : (rider.name || 'Rider')
            }</h1>
            <div className="mono" style={{
              fontSize: 11, color: 'oklch(1 0 0 / 0.85)', marginTop: 4,
              letterSpacing: 0.06, textTransform: 'uppercase',
            }}>
              {rider.skill} · {rider.distanceKm} km
            </div>
          </div>
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 100px' }}>
        {/* Open-to-ride status pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999, marginBottom: 18,
          background: rider.available ? 'var(--accent-soft)' : 'var(--bg-surface)',
          border: `1px solid ${rider.available ? 'var(--accent)' : 'var(--line-soft)'}`,
          color: rider.available ? 'var(--accent)' : 'var(--fg-dim)',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: 0.06, textTransform: 'uppercase',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: rider.available ? 'var(--accent)' : 'var(--fg-dim)',
          }}/>
          {rider.available ? 'Open to ride' : 'Not riding now'}
        </div>

        {/* Bio */}
        {rider.bio && (
          <p style={{
            margin: '0 0 22px', fontSize: 14, lineHeight: 1.55,
            color: 'var(--fg-muted)', textWrap: 'pretty',
          }}>{rider.bio}</p>
        )}

        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
          <RiderStat label="Sports"        value={sportLabels || '—'}/>
          <RiderStat label="Home"          value={rider.homeMountain || '—'}/>
          <RiderStat label="City"          value={rider.city || '—'}/>
          <RiderStat label="Accolades"     value={String(rider.accolades?.length || 0)} highlight={!!rider.accolades?.length}/>
        </div>

        {/* Wave CTA */}
        <button
          onClick={wave}
          className="btn-accent"
          style={{ width: '100%', marginBottom: 22 }}
        >👋 Send a wave</button>

        {/* Accolades */}
        {rider.accolades?.length > 0 && (
          <>
            <SectionLabel kicker="★" label="Accolades" sub={`${rider.accolades.length} listed`}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {rider.accolades.map((a, i) => (
                <div key={i} style={{
                  padding: 12, borderRadius: 10,
                  background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14,
                  }}>★</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
                      {a.event}{a.year ? ` · ${a.year}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function RiderStat({ label, value, highlight }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: 'var(--bg-surface)',
      border: `1px solid ${highlight ? 'var(--accent)' : 'var(--line-soft)'}`,
    }}>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
        color: 'var(--fg-dim)',
      }}>{label}</div>
      <div style={{
        marginTop: 4, fontSize: 14, fontWeight: 600,
        color: highlight ? 'var(--accent)' : 'var(--fg)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
  );
}

window.RiderProfile = RiderProfile;
