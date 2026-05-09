// JamRadar — Riders tab
// Standalone screen for browsing other riders. Pulls live opted-in users from
// Supabase via window.JR_FETCH_RIDERS, supplements with seed RIDERS while the
// user base is small. Filters by sport + availability.

const { SPORTS: _RT_SPORTS, RIDERS: _RT_SEED_RIDERS } = window.JR_DATA;

function RidersScreen({ prefs, onOpenRider }) {
  const [realRiders, setRealRiders] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [filterSport, setFilterSport] = React.useState(null);
  const [showAvailableOnly, setShowAvailableOnly] = React.useState(false);

  React.useEffect(() => {
    if (!window.JR_SUPABASE_READY || !window.JR_FETCH_RIDERS) return;
    let cancelled = false;
    setLoading(true);
    const refresh = async () => {
      const fresh = await window.JR_FETCH_RIDERS();
      if (cancelled) return;
      setRealRiders(fresh || []);
      setLoading(false);
    };
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Show seed riders ONLY when there are no live ones AND we're not still
  // loading. Once even one real opted-in rider arrives, the seeds are hidden
  // — testers shouldn't see fake names sitting next to their friends.
  const useSeeds = !loading && realRiders.length === 0;
  const all = useSeeds
    ? (_RT_SEED_RIDERS || []).map(r => ({ ...r, _seed: true }))
    : realRiders;

  const filtered = all
    .filter(r => !filterSport || (r.sports || []).includes(filterSport))
    .filter(r => !showAvailableOnly || r.available)
    .sort((a, b) => {
      const realA = a._real ? 1 : 0, realB = b._real ? 1 : 0;
      if (realA !== realB) return realB - realA;
      const availA = a.available ? 1 : 0, availB = b.available ? 1 : 0;
      if (availA !== availB) return availB - availA;
      return (a.name || '').localeCompare(b.name || '');
    });

  const realCount = filtered.filter(r => r._real).length;

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '4px 18px 12px' }}>
        <div className="mono" style={{
          fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
          color: 'var(--fg-dim)',
        }}>
          Crew
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginTop: 2,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
            letterSpacing: '-0.025em',
          }}>Riders</div>
          {prefs?.openToRide && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 700,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)',
              }}/>
              You're listed
            </span>
          )}
        </div>
        <div className="mono" style={{
          fontSize: 10, color: 'var(--fg-dim)', marginTop: 4,
          letterSpacing: 0.06,
        }}>
          {loading ? 'Loading…' :
            realCount > 0
              ? `${realCount} live rider${realCount === 1 ? '' : 's'} open to ride`
              : `${filtered.length} sample · live profiles populate as testers join`}
        </div>
      </div>

      {/* Sport pill filter */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 18px 12px',
        overflowX: 'auto', flexShrink: 0,
      }} className="jr-scroll">
        <PillChip
          active={!filterSport}
          onClick={() => setFilterSport(null)}
          label="All"
          count={all.length}
        />
        {_RT_SPORTS.map(s => {
          const count = all.filter(r => (r.sports || []).includes(s.id)).length;
          if (count === 0) return null;
          return (
            <PillChip
              key={s.id}
              active={filterSport === s.id}
              onClick={() => setFilterSport(s.id)}
              label={s.label}
              icon={s.icon}
              count={count}
            />
          );
        })}
      </div>

      {/* Available-only toggle */}
      <div style={{ padding: '0 18px 12px' }}>
        <button
          onClick={() => setShowAvailableOnly(v => !v)}
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 999,
            background: showAvailableOnly ? 'var(--accent-soft)' : 'var(--bg-surface)',
            border: `1px solid ${showAvailableOnly ? 'var(--accent)' : 'var(--line-soft)'}`,
            color: showAvailableOnly ? 'var(--accent)' : 'var(--fg-muted)',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: showAvailableOnly ? 'var(--accent)' : 'var(--fg-dim)',
          }}/>
          {showAvailableOnly ? 'Open to ride only' : 'Show all riders'}
        </button>
      </div>

      {/* Riders list */}
      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--fg-muted)',
            border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>◯</div>
            No riders match.<br/>
            <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>
              {showAvailableOnly ? 'Try clearing the "Open to ride" filter.' : 'Try a different sport filter.'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(rider => (
              <RiderRow
                key={rider.id}
                rider={rider}
                onOpen={() => onOpenRider?.(rider.id)}
              />
            ))}
          </div>
        )}

        {/* Footer hint when user isn't listed yet */}
        {!prefs?.openToRide && (
          <div style={{
            marginTop: 16, padding: 14,
            background: 'var(--bg-surface)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ color: 'var(--accent)' }}>{Icon.spark(20)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Want to be found by other riders?</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
                Toggle "Open to ride" on the You tab.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wider tap target than the horizontal-scroll chip on Discover.
function RiderRow({ rider, onOpen }) {
  const accolades = rider.accolades || [];
  const sportLabels = (rider.sports || [])
    .map(id => _RT_SPORTS.find(s => s.id === id)?.label)
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');

  return (
    <button onClick={onOpen} style={{
      appearance: 'none', cursor: 'pointer', width: '100%',
      padding: 14, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)',
      border: `1px solid ${rider._real ? 'var(--accent)' : 'var(--line-soft)'}`,
      display: 'flex', alignItems: 'center', gap: 12,
      color: 'var(--fg)', textAlign: 'left',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, oklch(0.55 0.18 ${rider.color || 95}), oklch(0.35 0.05 240))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
        color: 'white',
      }}>{rider.initials || (rider.name || 'R').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontWeight: 600, fontSize: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{rider.name}</span>
          {rider._real && (
            <span className="mono" style={{
              fontSize: 8.5, padding: '2px 6px', borderRadius: 4,
              background: 'var(--accent)', color: 'var(--accent-ink)',
              letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 700,
            }}>Live</span>
          )}
        </div>
        <div className="mono" style={{
          fontSize: 10, color: 'var(--fg-dim)', marginTop: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {sportLabels || '—'}
          {rider.skill ? ` · ${rider.skill}` : ''}
          {rider.distanceKm != null ? ` · ${rider.distanceKm} km` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <span className="mono" style={{
            fontSize: 9, letterSpacing: 0.08, textTransform: 'uppercase',
            color: rider.available ? 'var(--accent)' : 'var(--fg-dim)',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: rider.available ? 'var(--accent)' : 'var(--fg-dim)',
            }}/>
            {rider.available ? 'Open to ride' : 'Not riding'}
          </span>
          {accolades.length > 0 && (
            <span className="mono" style={{
              fontSize: 9, color: 'var(--fg-dim)',
              letterSpacing: 0.06, textTransform: 'uppercase',
            }}>★ {accolades.length}</span>
          )}
        </div>
      </div>
      <span style={{ color: 'var(--fg-muted)', flexShrink: 0 }}>{Icon.arrowR(16)}</span>
    </button>
  );
}

window.RidersScreen = RidersScreen;
