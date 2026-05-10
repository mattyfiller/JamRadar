// JamRadar — Public organizer profile

function OrgProfile({ orgName, events, savedIds, followedOrgs, onToggleFollow, onOpenEvent, onSave, onBack }) {
  const myEvents   = events.filter(e => e.org === orgName && e.status !== 'pending');
  const sample     = myEvents[0];
  const isFollowed = followedOrgs?.includes(orgName);
  const verified   = !!sample?.orgVerified;
  const orgType    = sample?.indoor || sample?.sport === 'indoor' ? 'Indoor facility'
                   : /skatepark/i.test(orgName) ? 'Skatepark'
                   : /shop|skis$/i.test(orgName) ? 'Shop'
                   : 'Mountain';

  // Aggregate going + saves across the org's events as a tiny social proof.
  const totalGoing = myEvents.reduce((sum, e) => sum + (e.going || 0), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Hero */}
      <div className="poster-ph" style={{
        position: 'relative', height: 200,
        background: `linear-gradient(135deg, oklch(0.40 0.06 ${sample?.color || 95}) 0%, oklch(0.18 0.02 240) 100%)`,
      }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
        }}>
          <BackButton onClick={onBack} variant="pill"/>
        </div>
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
          <div className="mono" style={{
            fontSize: 10, color: 'oklch(1 0 0 / 0.7)',
            letterSpacing: 0.12, textTransform: 'uppercase', marginBottom: 8,
          }}>{orgType}</div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 28, letterSpacing: '-0.025em', lineHeight: 1.05,
            color: 'white', textShadow: '0 2px 18px oklch(0 0 0 / 0.5)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            {orgName}
            {verified && (
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--accent)', color: 'var(--accent-ink)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>✓</span>
            )}
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 120px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
          <Stat n={myEvents.length} label="Events"/>
          <Stat n={totalGoing}      label="Going"/>
          <Stat n={isFollowed ? 1 : 0} label="You follow" highlight={isFollowed}/>
        </div>

        {/* Follow CTA */}
        <button
          onClick={() => onToggleFollow?.(orgName)}
          className={isFollowed ? 'btn-ghost' : 'btn-accent'}
          style={{
            width: '100%', marginBottom: 22,
            ...(isFollowed ? {
              background: 'var(--accent-soft)',
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            } : {}),
          }}
        >{isFollowed ? '✓ Following' : 'Follow'}</button>

        {/* Events */}
        <SectionLabel kicker="·" label="Events" sub={`${myEvents.length} live`}/>
        {myEvents.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center', color: 'var(--fg-muted)',
            border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
            fontSize: 13,
          }}>
            No live events from this org right now.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myEvents.map(e => (
              <ListEventRow key={e.id}
                event={{ ...e, saved: savedIds.includes(e.id) }}
                onOpen={() => onOpenEvent(e.id)}
                onSave={onSave}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label, highlight }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10, textAlign: 'center',
      background: 'var(--bg-surface)',
      border: `1px solid ${highlight ? 'var(--accent)' : 'var(--line-soft)'}`,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
        color: 'var(--accent)',
      }}>{n}</div>
      <div className="mono" style={{
        fontSize: 9, color: 'var(--fg-dim)',
        letterSpacing: 0.1, textTransform: 'uppercase', marginTop: 2,
      }}>{label}</div>
    </div>
  );
}

window.OrgProfile = OrgProfile;
