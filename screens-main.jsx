// JamRadar — Discover, Map, Saved, Gear screens

const { GEAR_DEALS, SPORTS, EVENT_TYPES } = window.JR_DATA;

// Hide events still pending admin approval from the rider feed.
const visibleToRiders = (e) => e.status !== 'pending';

// ───────────── DISCOVER ─────────────
function DiscoverScreen({ events, prefs, onOpenEvent, onSave, savedIds, onOpenNotifs, onOpenRider, onOpenRidersTab, hasUnreadNotifs }) {
  const [filterSport, setFilterSport] = React.useState(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [query, setQuery] = React.useState('');
  // Event-type prefs from onboarding govern *notifications*, not feed visibility.
  // Default the feed to all-types so users see everything in their sports+radius.
  const [extra, setExtra] = React.useState({
    types: [],
    maxKm: prefs?.radius || 250,
    indoorMode: 'all',
    cost: 'all',
  });

  // When the user changes radius from Profile, mirror it into the live filter.
  React.useEffect(() => {
    setExtra(x => ({ ...x, maxKm: prefs?.radius ?? x.maxKm }));
  }, [prefs?.radius]);

  // Sports the user picked at onboarding shape the baseline pool.
  const userSportPool = prefs?.sports?.length
    ? events.filter(e => prefs.sports.includes(e.sport))
    : events;

  const matchesQuery = (e) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return [e.title, e.org, e.location, e.type, e.sport]
      .filter(Boolean)
      .some(s => s.toLowerCase().includes(q));
  };
  const matchesExtra = (e) => {
    if (extra.types.length && !extra.types.includes(e.type)) return false;
    if (e.distanceKm != null && e.distanceKm > extra.maxKm) return false;
    if (extra.indoorMode === 'indoor' && !e.indoor && e.sport !== 'indoor') return false;
    if (extra.indoorMode === 'outdoor' && (e.indoor || e.sport === 'indoor')) return false;
    if (extra.cost === 'free' && !(e.cost && e.cost.toLowerCase().startsWith('free'))) return false;
    if (extra.cost === 'paid' && e.cost && e.cost.toLowerCase().startsWith('free')) return false;
    return true;
  };

  const filtered = userSportPool
    .filter(visibleToRiders)
    .filter(e => filterSport ? e.sport === filterSport : true)
    .filter(matchesQuery)
    .filter(matchesExtra);

  // Featured events float to the top of the feed without taking over a separate
  // section. Keeps the placement subtly monetisable but not intrusive.
  const featuredFirst = [
    ...filtered.filter(e => e.featured),
    ...filtered.filter(e => !e.featured),
  ];

  const baselineMaxKm = prefs?.radius ?? 250;
  const activeExtraCount =
    (extra.types.length ? 1 : 0) +
    (extra.maxKm !== baselineMaxKm ? 1 : 0) +
    (extra.indoorMode !== 'all' ? 1 : 0) +
    (extra.cost !== 'all' ? 1 : 0);

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '4px 18px 10px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <div>
            <div className="mono" style={{
              fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
              color: 'var(--fg-dim)',
            }}>{prefs?.city || 'Toronto'} · {prefs?.radius || 50} km</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
              letterSpacing: '-0.025em', marginTop: 2,
            }}>
              On the radar <span style={{ color: 'var(--accent)' }}>·</span>
            </div>
          </div>
          <IconBtn onClick={onOpenNotifs} badge={hasUnreadNotifs}>
            {Icon.bell(22)}
          </IconBtn>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--line-soft)',
        }}>
          <span style={{ color: 'var(--fg-dim)' }}>{Icon.search(18)}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, mountains, shops…"
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--fg)',
              fontSize: 14, padding: 0,
              outline: 'none',
            }}
            onFocus={(e) => e.currentTarget.style.outline = 'none'}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" style={{
              appearance: 'none', border: 'none', background: 'transparent',
              color: 'var(--fg-dim)', cursor: 'pointer', padding: 0, fontSize: 16,
              lineHeight: 1,
            }}>×</button>
          )}
          <button
            onClick={() => setShowFilters(true)}
            aria-label="Open filters"
            style={{
              appearance: 'none', border: 'none', background: 'transparent',
              color: activeExtraCount ? 'var(--accent)' : 'var(--fg)',
              cursor: 'pointer', padding: 0, position: 'relative',
            }}
          >
            {Icon.filter(20)}
            {activeExtraCount > 0 && (
              <span className="mono" style={{
                position: 'absolute', top: -4, right: -8,
                background: 'var(--accent)', color: 'var(--accent-ink)',
                fontSize: 9, padding: '1px 5px', borderRadius: 999, fontWeight: 700,
                lineHeight: 1.4,
              }}>{activeExtraCount}</span>
            )}
          </button>
        </div>

        {/* Sport pills */}
        <div style={{
          display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto',
          paddingBottom: 4,
          marginLeft: -18, marginRight: -18,
          paddingLeft: 18, paddingRight: 18,
        }} className="jr-scroll">
          <PillChip active={!filterSport} onClick={() => setFilterSport(null)} label="All" count={userSportPool.filter(visibleToRiders).length}/>
          {SPORTS
            .filter(s => !prefs?.sports?.length || prefs.sports.includes(s.id))
            .map(s => (
              <PillChip key={s.id}
                active={filterSport === s.id}
                onClick={() => setFilterSport(s.id)}
                label={s.label}
                icon={s.icon}
                count={userSportPool.filter(visibleToRiders).filter(e => e.sport === s.id).length}/>
            ))}
        </div>
      </div>

      {/* Feed */}
      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 100px' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--fg-muted)',
            border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>◌</div>
            No events match.<br/>
            <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>
              Try a broader radius or clear some filters.
            </span>
          </div>
        ) : (
          <>
            {/* Section 1: This week — featured events float to the top, badged. */}
            <SectionLabel kicker="01" label="This week" sub={`${featuredFirst.length} event${featuredFirst.length === 1 ? '' : 's'} in range`}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {featuredFirst.slice(0, 1).map(e => (
                <EventCard key={e.id} event={{ ...e, saved: savedIds.includes(e.id) }}
                  onOpen={() => onOpenEvent(e.id)} onSave={onSave} variant="hero"/>
              ))}
              {featuredFirst.slice(1, 3).map(e => (
                <EventCard key={e.id} event={{ ...e, saved: savedIds.includes(e.id) }}
                  onOpen={() => onOpenEvent(e.id)} onSave={onSave}/>
              ))}
            </div>

            {/* Indoor strip — only when no extra filters narrow it out */}
            {featuredFirst.some(e => e.indoor || e.sport === 'indoor') && (
              <>
                <SectionLabel kicker="02" label="Indoor & off-season"
                  sub="Year-round training near you" style={{ marginTop: 26 }}/>
                <div style={{
                  display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6,
                  marginRight: -16, paddingRight: 16,
                }} className="jr-scroll">
                  {featuredFirst.filter(e => e.indoor || e.sport === 'indoor').map(e => (
                    <div key={e.id} style={{ flex: '0 0 230px' }}>
                      <CompactEventCard event={{ ...e, saved: savedIds.includes(e.id) }}
                        onOpen={() => onOpenEvent(e.id)} onSave={onSave}/>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Riders near you — preview strip with link to the full Riders tab */}
            <RidersNearbySection prefs={prefs} onOpenRider={onOpenRider} onOpenRidersTab={onOpenRidersTab}/>

            {/* More */}
            {featuredFirst.length > 3 && (
              <>
                <SectionLabel kicker="03" label="Coming up" sub="Next 30 days" style={{ marginTop: 26 }}/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {featuredFirst.slice(3).map(e => (
                    <ListEventRow key={e.id} event={{ ...e, saved: savedIds.includes(e.id) }}
                      onOpen={() => onOpenEvent(e.id)} onSave={onSave}/>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showFilters && (
        <FilterSheet
          extra={extra}
          onChange={setExtra}
          onClose={() => setShowFilters(false)}
          resultCount={filtered.length}
        />
      )}
    </div>
  );
}

// "Riders near you" preview on Discover.
// A short teaser strip that links to the full Riders tab. We show ~6 cards;
// for the full list, the user taps "See all" → Riders tab.
function RidersNearbySection({ prefs, onOpenRider, onOpenRidersTab }) {
  const seedRiders = window.JR_DATA.RIDERS || [];
  const [realRiders, setRealRiders] = React.useState([]);

  React.useEffect(() => {
    if (!window.JR_SUPABASE_READY) return;
    let cancelled = false;
    const refresh = async () => {
      const fresh = await window.JR_FETCH_RIDERS?.();
      if (!cancelled && fresh) setRealRiders(fresh);
    };
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const all = [
    ...realRiders,
    ...seedRiders.map(r => ({ ...r, _seed: true })),
  ];

  const sportSet = new Set(prefs?.sports || []);
  const radius = prefs?.radius || 100;
  const candidates = all
    .filter(r => r.distanceKm == null || r.distanceKm <= radius * 1.2)
    .filter(r => !sportSet.size || (r.sports || []).some(s => sportSet.has(s)))
    .sort((a, b) => {
      const realA = a._real ? 1 : 0, realB = b._real ? 1 : 0;
      if (realA !== realB) return realB - realA;
      const availA = a.available ? 1 : 0, availB = b.available ? 1 : 0;
      if (availA !== availB) return availB - availA;
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, 6);                   // teaser only — full list lives on the Riders tab

  if (candidates.length === 0) return null;

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginTop: 26, marginBottom: 12,
      }}>
        <SectionLabel kicker="◯" label="Riders near you" sub="Find your next session crew"/>
        <button onClick={onOpenRidersTab} className="mono" style={{
          appearance: 'none', border: 'none', background: 'transparent',
          color: 'var(--accent)', cursor: 'pointer',
          fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 700,
          padding: '6px 0',
        }}>See all →</button>
      </div>
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6,
        marginRight: -16, paddingRight: 16,
      }} className="jr-scroll">
        {candidates.map(r => (
          <RiderChip key={r.id} rider={r} onOpen={() => onOpenRider?.(r.id)}/>
        ))}
      </div>
    </>
  );
}

function RiderChip({ rider, onOpen }) {
  return (
    <button onClick={onOpen} style={{
      flex: '0 0 200px', width: 200,
      appearance: 'none', cursor: 'pointer', textAlign: 'left',
      background: 'var(--bg-surface)',
      border: '1px solid var(--line-soft)',
      borderRadius: 'var(--r-md)', padding: 12, color: 'var(--fg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: `linear-gradient(135deg, oklch(0.55 0.18 ${rider.color}), oklch(0.35 0.05 240))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
          color: 'white',
        }}>{rider.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 13,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{rider.name}</div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)', marginTop: 2 }}>
            {rider.distanceKm} km · {rider.skill}
          </div>
        </div>
      </div>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 0.06, textTransform: 'uppercase',
        color: rider.available ? 'var(--accent)' : 'var(--fg-dim)',
      }}>
        {rider.available ? '● Open to ride' : 'Not riding now'}
      </div>
    </button>
  );
}

// Bottom-sheet filter modal
function FilterSheet({ extra, onChange, onClose, resultCount }) {
  const update = (patch) => onChange({ ...extra, ...patch });
  const toggleType = (t) => update({
    types: extra.types.includes(t)
      ? extra.types.filter(x => x !== t)
      : [...extra.types, t],
  });
  const reset = () => onChange({ types: [], maxKm: 250, indoorMode: 'all', cost: 'all' });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        background: 'oklch(0 0 0 / 0.5)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        animation: 'jr-fade-in .2s ease forwards',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-base)',
          borderTop: '1px solid var(--line)',
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          padding: '14px 18px 22px',
          maxHeight: '78%',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -12px 40px oklch(0 0 0 / 0.5)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--line)', margin: '0 auto 12px',
        }}/>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
            letterSpacing: '-0.02em',
          }}>Filters</div>
          <button onClick={reset} className="mono" style={{
            appearance: 'none', border: 'none', background: 'transparent',
            color: 'var(--accent)', cursor: 'pointer',
            fontSize: 11, letterSpacing: 0.1, textTransform: 'uppercase',
          }}>Reset</button>
        </div>

        <div className="jr-scroll" style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
          {/* Indoor / Outdoor */}
          <FilterGroup label="Where">
            {[
              ['all', 'All'], ['indoor', 'Indoor'], ['outdoor', 'Outdoor'],
            ].map(([id, lbl]) => (
              <SegBtn key={id} on={extra.indoorMode === id}
                onClick={() => update({ indoorMode: id })}>{lbl}</SegBtn>
            ))}
          </FilterGroup>

          {/* Cost */}
          <FilterGroup label="Cost">
            {[
              ['all', 'All'], ['free', 'Free'], ['paid', 'Paid'],
            ].map(([id, lbl]) => (
              <SegBtn key={id} on={extra.cost === id}
                onClick={() => update({ cost: id })}>{lbl}</SegBtn>
            ))}
          </FilterGroup>

          {/* Max distance */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 8,
            }}>
              <span className="mono" style={{
                fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
                color: 'var(--fg-dim)',
              }}>Max distance</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16,
                color: 'var(--accent)',
              }}>{extra.maxKm} km</span>
            </div>
            <input
              type="range" min={5} max={500} step={5}
              value={extra.maxKm}
              onChange={(e) => update({ maxKm: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'oklch(0.88 0.18 100)' }}
            />
          </div>

          {/* Event types */}
          <FilterGroup label={`Event types (${extra.types.length || 'any'})`} stack>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EVENT_TYPES.map(t => {
                const on = extra.types.includes(t);
                return (
                  <button key={t} onClick={() => toggleType(t)} style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '8px 12px', borderRadius: 999, fontSize: 12,
                    background: on ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    color: on ? 'var(--accent-ink)' : 'var(--fg)',
                  }}>{t}</button>
                );
              })}
            </div>
          </FilterGroup>
        </div>

        <button onClick={onClose} className="btn-accent" style={{ marginTop: 8 }}>
          Show {resultCount} event{resultCount === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  );
}

function FilterGroup({ label, children, stack }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="mono" style={{
        fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
        color: 'var(--fg-dim)', marginBottom: 8,
      }}>{label}</div>
      <div style={{
        display: 'flex', gap: 6,
        flexDirection: stack ? 'column' : 'row',
      }}>{children}</div>
    </div>
  );
}

function SegBtn({ on, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer', flex: 1,
      padding: '10px 12px', borderRadius: 10, fontSize: 13,
      background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
      border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
      color: on ? 'var(--accent)' : 'var(--fg)',
      fontFamily: 'var(--font-display)', fontWeight: 500,
    }}>{children}</button>
  );
}

function PillChip({ active, onClick, label, icon, count }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 12px', borderRadius: 999,
      background: active ? 'var(--accent)' : 'var(--bg-surface)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--line-soft)'}`,
      color: active ? 'var(--accent-ink)' : 'var(--fg)',
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
      {label}
      <span className="mono" style={{
        fontSize: 10, opacity: 0.6,
      }}>{count}</span>
    </button>
  );
}

function SectionLabel({ kicker, label, sub, style }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        <span className="mono" style={{
          fontSize: 10, letterSpacing: 0.12, color: 'var(--accent)',
        }}>{kicker}</span>
        <h2 style={{
          margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 18, letterSpacing: '-0.02em',
        }}>{label}</h2>
      </div>
      {sub && (
        <div className="mono" style={{
          fontSize: 10, color: 'var(--fg-dim)', letterSpacing: 0.06,
          marginTop: 3,
        }}>{sub}</div>
      )}
    </div>
  );
}

// Compact horizontal scroll card
function CompactEventCard({ event, onOpen, onSave }) {
  return (
    <button onClick={onOpen} style={{
      width: '100%', appearance: 'none', cursor: 'pointer', textAlign: 'left',
      background: 'var(--bg-surface)',
      border: `1px solid ${event.featured ? 'var(--accent)' : 'var(--line-soft)'}`,
      borderRadius: 'var(--r-md)', padding: 12, color: 'var(--fg)',
    }}>
      <div className="poster-ph" style={{
        height: 80, borderRadius: 8, marginBottom: 10, position: 'relative',
        background: `linear-gradient(135deg, oklch(0.32 0.04 ${event.color}) 0%, oklch(0.20 0.02 240) 100%)`,
        display: 'flex', alignItems: 'flex-end', padding: 8,
      }}>
        <span className="bib" style={{ fontSize: 9 }}>{event.type}</span>
        {event.featured && (
          <span style={{ position: 'absolute', top: 6, right: 6 }}>
            <FeaturedBadge/>
          </span>
        )}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{event.title}</div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 4 }}>
        {event.distanceKm} km · {event.cost}
      </div>
    </button>
  );
}

// List-style event row (compact)
function ListEventRow({ event, onOpen, onSave }) {
  return (
    <div onClick={onOpen} role="button" tabIndex={0} style={{
      width: '100%', cursor: 'pointer', textAlign: 'left',
      background: 'transparent', color: 'var(--fg)',
      border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)',
      padding: 12, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div className="poster-ph" style={{
        flex: '0 0 56px', height: 56, borderRadius: 8,
        background: `linear-gradient(135deg, oklch(0.32 0.04 ${event.color}) 0%, oklch(0.20 0.02 240) 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white',
      }}>
        <span className="mono" style={{
          fontSize: 9, letterSpacing: 0.06, textTransform: 'uppercase', opacity: 0.95,
        }}>{event.type.split(' ')[0]}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            fontWeight: 600, fontSize: 14, lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>{event.title}</div>
          {event.featured && <FeaturedBadge/>}
        </div>
        <div className="mono" style={{
          fontSize: 10, color: 'var(--fg-muted)', marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{event.when} · {event.distanceKm} km</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onSave(event.id); }} style={{
        appearance: 'none', border: 'none', background: 'transparent',
        color: event.saved ? 'var(--accent)' : 'var(--fg-dim)', cursor: 'pointer', padding: 4,
      }}>{Icon.bookmark(18, event.saved)}</button>
    </div>
  );
}

// ───────────── MAP ─────────────
function MapScreen({ events, prefs, onOpenEvent, savedIds, onSave }) {
  const [showFilters, setShowFilters] = React.useState(false);
  const [extra, setExtra] = React.useState({
    types: [],
    maxKm: prefs?.radius || 250,
    indoorMode: 'all',
    cost: 'all',
  });

  const visible = events
    .filter(visibleToRiders)
    .filter(e => prefs?.sports?.length ? prefs.sports.includes(e.sport) : true)
    .filter(e => !extra.types.length || extra.types.includes(e.type))
    .filter(e => e.distanceKm == null || e.distanceKm <= extra.maxKm)
    .filter(e => extra.indoorMode === 'all'
      || (extra.indoorMode === 'indoor' && (e.indoor || e.sport === 'indoor'))
      || (extra.indoorMode === 'outdoor' && !(e.indoor || e.sport === 'indoor')))
    .filter(e => extra.cost === 'all'
      || (extra.cost === 'free' && e.cost && e.cost.toLowerCase().startsWith('free'))
      || (extra.cost === 'paid' && (!e.cost || !e.cost.toLowerCase().startsWith('free'))));

  const [selected, setSelected] = React.useState(visible[0]?.id);
  React.useEffect(() => {
    if (selected && !visible.find(e => e.id === selected)) setSelected(visible[0]?.id);
  }, [visible, selected]);
  const sel = visible.find(e => e.id === selected);

  return (
    <div style={{ height: '100%', position: 'relative', background: 'oklch(0.14 0.02 240)' }}>
      <LeafletMap
        events={visible}
        selectedId={selected}
        onSelect={setSelected}
        prefs={prefs}
        radiusKm={extra.maxKm}
      />

      {/* Top header overlay */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, padding: '4px 16px 14px',
        background: 'linear-gradient(180deg, oklch(0.16 0.018 240 / 0.7) 0%, transparent 100%)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10,
        }}>
          <div className="mono" style={{
            background: 'oklch(0.20 0.02 240 / 0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--line-soft)',
            padding: '8px 12px', borderRadius: 999,
            fontSize: 10, letterSpacing: 0.1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--accent)' }}>{Icon.radar(14)}</span>
            <span style={{ textTransform: 'uppercase' }}>{extra.maxKm} km · {visible.length} event{visible.length === 1 ? '' : 's'}</span>
          </div>
          <button onClick={() => setShowFilters(true)} style={{
            appearance: 'none', border: '1px solid var(--line-soft)',
            background: 'oklch(0.20 0.02 240 / 0.85)', backdropFilter: 'blur(10px)',
            padding: '8px 12px', borderRadius: 999,
            color: 'var(--fg)', fontSize: 12, cursor: 'pointer',
          }}>Filters</button>
        </div>
      </div>

      {showFilters && (
        <FilterSheet extra={extra} onChange={setExtra}
          onClose={() => setShowFilters(false)}
          resultCount={visible.length}/>
      )}

      {/* Bottom selected event card — sits above the bottom nav with safe-area gap. */}
      {sel && (
        <div style={{
          position: 'absolute', left: 16, right: 16,
          bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          background: 'oklch(0.20 0.02 240 / 0.95)',
          backdropFilter: 'blur(14px)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          padding: 14,
          boxShadow: '0 12px 32px oklch(0 0 0 / 0.5)',
        }} onClick={() => onOpenEvent(sel.id)}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="poster-ph" style={{
              flex: '0 0 56px', height: 56, borderRadius: 8,
              background: `linear-gradient(135deg, oklch(0.32 0.04 ${sel.color}) 0%, oklch(0.20 0.02 240) 100%)`,
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="bib" style={{ fontSize: 9 }}>{sel.type}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)' }}>{sel.coords}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginTop: 6, lineHeight: 1.2 }}>{sel.title}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 4 }}>
                {sel.when} · {sel.distanceKm} km
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// City → user-coords lookup, derived from the shared NA_CITIES list in data.jsx
// so onboarding, LeafletMap, and ingest all agree on the same metro set.
const CITY_COORDS = (() => {
  const out = {};
  for (const c of (window.JR_DATA?.NA_CITIES || [])) {
    out[c.name.toLowerCase()] = [c.lat, c.lon];
  }
  // Ensure the Toronto default exists even if the list is later trimmed.
  if (!out.toronto) out.toronto = [43.6532, -79.3832];
  return out;
})();

// "44.5018° N · 80.3097° W" → [44.5018, -80.3097]
function parseCoords(str) {
  if (!str) return null;
  const m = str.match(/(-?\d+(?:\.\d+)?)\s*°\s*([NS])\s*[·,]\s*(-?\d+(?:\.\d+)?)\s*°\s*([EW])/i);
  if (!m) return null;
  const lat = parseFloat(m[1]) * (m[2].toUpperCase() === 'S' ? -1 : 1);
  const lon = parseFloat(m[3]) * (m[4].toUpperCase() === 'W' ? -1 : 1);
  return [lat, lon];
}

// Real Leaflet map with dark tiles, radius circle, and event markers.
function LeafletMap({ events, selectedId, onSelect, prefs, radiusKm }) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const layersRef = React.useRef({ markers: {}, circle: null, you: null });

  const userCoords = CITY_COORDS[(prefs?.city || 'Toronto').toLowerCase()] || CITY_COORDS.toronto;

  // Init the map exactly once. Subsequent updates flow through the second effect.
  React.useEffect(() => {
    if (!window.L || !containerRef.current || mapRef.current) return;
    const map = window.L.map(containerRef.current, {
      zoomControl: false, attributionControl: false,
    }).setView(userCoords, 9);
    // CARTO dark-matter tiles match the app's dark theme.
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', {
      subdomains: 'abcd', maxZoom: 20,
    }).addTo(map);
    mapRef.current = map;
    // Cleanup on unmount
    return () => { map.remove(); mapRef.current = null; layersRef.current = { markers: {}, circle: null, you: null }; };
  }, []);

  // Sync user position + radius circle when prefs change.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { you, circle } = layersRef.current;
    if (you) you.remove();
    if (circle) circle.remove();
    layersRef.current.you = window.L.circleMarker(userCoords, {
      radius: 7, color: 'oklch(0.88 0.18 100)', fillColor: 'oklch(0.88 0.18 100)',
      fillOpacity: 1, weight: 3, opacity: 0.5,
    }).addTo(map).bindTooltip(prefs?.city || 'You');
    layersRef.current.circle = window.L.circle(userCoords, {
      radius: (radiusKm || 50) * 1000,
      color: 'oklch(0.88 0.18 100)', weight: 1, opacity: 0.5,
      fillColor: 'oklch(0.88 0.18 100)', fillOpacity: 0.05, dashArray: '4 6',
    }).addTo(map);
  }, [userCoords[0], userCoords[1], radiusKm, prefs?.city]);

  // Sync event markers whenever the visible list or selection changes.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set();
    events.forEach(e => {
      const c = parseCoords(e.coords);
      if (!c) return;
      seen.add(e.id);
      const isSel = e.id === selectedId;
      let marker = layersRef.current.markers[e.id];
      const html = `
        <div style="
          padding: 4px 8px; border-radius: 4px; white-space: nowrap;
          background: ${isSel ? 'oklch(0.88 0.18 100)' : 'oklch(0.20 0.02 240 / 0.95)'};
          color: ${isSel ? 'oklch(0.20 0.04 100)' : 'white'};
          border: 1px solid ${isSel ? 'oklch(0.88 0.18 100)' : 'oklch(0.88 0.18 100 / 0.5)'};
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase;
          font-weight: 700; box-shadow: 0 4px 10px oklch(0 0 0 / 0.4);
        ">${e.distanceKm != null ? e.distanceKm + 'km' : e.type}</div>`;
      const icon = window.L.divIcon({ html, iconSize: null, className: 'jr-pin-icon' });
      const tooltipHtml = `
        <div style="font-weight:600;font-size:12px;line-height:1.25;margin-bottom:2px;">${e.title}</div>
        <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;opacity:0.75;">${e.when || ''}${e.distanceKm != null ? ' · ' + e.distanceKm + ' km' : ''}</div>`;
      if (!marker) {
        marker = window.L.marker(c, { icon }).addTo(map);
        marker.on('click', () => onSelect(e.id));
        // Hover (desktop) and long-press (mobile) reveal title + when.
        marker.bindTooltip(tooltipHtml, {
          direction: 'top', offset: [0, -10], className: 'jr-pin-tooltip', sticky: false,
        });
        layersRef.current.markers[e.id] = marker;
      } else {
        marker.setIcon(icon);
        marker.setLatLng(c);
        marker.setTooltipContent(tooltipHtml);
      }
    });
    // Drop stale markers
    Object.keys(layersRef.current.markers).forEach(id => {
      if (!seen.has(id)) {
        layersRef.current.markers[id].remove();
        delete layersRef.current.markers[id];
      }
    });
  }, [events, selectedId, onSelect]);

  return (
    <div ref={containerRef} style={{
      position: 'absolute', inset: 0,
      background: 'oklch(0.14 0.02 240)',
    }}/>
  );
}

// ───────────── SAVED / CALENDAR ─────────────
function SavedScreen({ events, onOpenEvent, savedIds, onSave }) {
  const [view, setView] = React.useState('list');  // list | week
  const saved = events.filter(e => savedIds.includes(e.id));

  const exportToCalendar = () => {
    if (!saved.length) {
      window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'No saved events yet' } }));
      return;
    }
    const ics = buildICS(saved);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url, download: 'jamradar.ics',
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Calendar file downloaded' } }));
  };

  // Group by month
  const byMonth = saved.reduce((acc, e) => {
    const m = e.when.split('·')[1]?.trim().split(' ')[0] || 'Soon';
    (acc[m] = acc[m] || []).push(e);
    return acc;
  }, {});

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 18px 14px' }}>
        <div className="mono" style={{
          fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
          color: 'var(--fg-dim)',
        }}>Calendar</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          letterSpacing: '-0.025em', marginTop: 2, marginBottom: 14,
        }}>Saved &amp; planned</div>

        {/* Toggle */}
        <div style={{
          display: 'inline-flex', padding: 3, borderRadius: 999,
          background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
        }}>
          {['list', 'week'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              appearance: 'none', cursor: 'pointer', border: 'none',
              padding: '6px 14px', borderRadius: 999,
              background: view === v ? 'var(--accent)' : 'transparent',
              color: view === v ? 'var(--accent-ink)' : 'var(--fg-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: 0.08,
            }}>{v}</button>
          ))}
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 100px' }}>
        {saved.length === 0 ? (
          <EmptyState />
        ) : view === 'list' ? (
          Object.entries(byMonth).map(([month, events]) => (
            <div key={month} style={{ marginBottom: 24 }}>
              <SectionLabel kicker={month} label={`${events.length} event${events.length > 1 ? 's' : ''}`}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {events.map(e => (
                  <ListEventRow key={e.id} event={{ ...e, saved: true }}
                    onOpen={() => onOpenEvent(e.id)} onSave={onSave}/>
                ))}
              </div>
            </div>
          ))
        ) : (
          <WeekView events={saved} onOpenEvent={onOpenEvent}/>
        )}

        <button
          onClick={exportToCalendar}
          disabled={!saved.length}
          style={{
            appearance: 'none', cursor: saved.length ? 'pointer' : 'default',
            marginTop: 16, padding: 16, width: '100%',
            background: 'transparent',
            border: '1px dashed var(--line)',
            borderRadius: 'var(--r-md)',
            textAlign: 'center', color: saved.length ? 'var(--fg-dim)' : 'var(--fg-dim)',
            fontFamily: 'var(--font-body)', fontSize: 13,
            opacity: saved.length ? 1 : 0.5,
          }}>
          <div style={{ marginBottom: 4 }}>{Icon.cal(20)}</div>
          Add saved events to your phone calendar
          <div className="mono" style={{
            fontSize: 10, marginTop: 6, color: 'var(--accent)',
          }}>SYNC ALL →</div>
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      padding: 40, textAlign: 'center', color: 'var(--fg-muted)',
      border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>◇</div>
      Nothing saved yet.<br/>
      <span style={{ fontSize: 12, color: 'var(--fg-dim)' }}>
        Bookmark events from Discover and they'll show up here.
      </span>
    </div>
  );
}

function WeekView({ events, onOpenEvent }) {
  // Days in conventional Mon-first week order
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Parse the 3-letter day prefix from event.when (e.g. "Sat · Nov 14 · 7:00 PM")
  // Falls back to no-day if format doesn't match.
  const dayOf = (e) => {
    const head = (e.when || '').split('·')[0]?.trim().slice(0, 3);
    return days.includes(head) ? head : null;
  };

  // Pull numeric date for the day-cell number (e.g. "Nov 14" → 14)
  const dateNumOf = (e) => {
    const second = (e.when || '').split('·')[1]?.trim() || '';
    const num = parseInt(second.split(' ')[1], 10);
    return Number.isFinite(num) ? num : null;
  };

  const byDay = days.reduce((acc, d) => { acc[d] = []; return acc; }, {});
  events.forEach(e => {
    const d = dayOf(e);
    if (d) byDay[d].push(e);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {days.map((d, i) => {
        const evs = byDay[d];
        // Use the first event's date number if any, otherwise show a placeholder count
        const dateNum = evs[0] ? dateNumOf(evs[0]) : null;
        return (
          <div key={d} style={{
            display: 'flex', gap: 12,
            padding: 12,
            background: evs.length ? 'var(--bg-surface)' : 'transparent',
            border: '1px solid var(--line-soft)',
            borderRadius: 10,
          }}>
            <div style={{
              width: 40, textAlign: 'center',
              borderRight: '1px solid var(--line-soft)',
              paddingRight: 12,
            }}>
              <div className="mono" style={{
                fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 0.1,
                textTransform: 'uppercase',
              }}>{d}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                lineHeight: 1, marginTop: 2,
                color: evs.length ? 'var(--fg)' : 'var(--fg-dim)',
              }}>{dateNum ?? '—'}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
              {evs.length === 0 ? (
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)' }}>—</span>
              ) : evs.map(e => (
                <div key={e.id} onClick={() => onOpenEvent(e.id)} style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.25 }}>{e.title}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>
                    {e.when}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Build a valid .ics calendar from a list of events. Best-effort date parsing
// from the prototype's "Sat · Nov 14 · 7:00 PM" format. Anything we can't parse
// becomes an all-day event so the user still gets a placeholder.
function buildICS(events) {
  const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JamRadar//Beta//EN',
    'CALSCALE:GREGORIAN',
  ];
  const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const yearGuess = (m) => {
    // Snowboard winter season spans years; use the last completed snow season for prototype.
    const now = new Date();
    return m >= 6 ? now.getFullYear() : now.getFullYear() + 1;  // Nov 2024 / May 2026 etc.
  };
  const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  events.forEach((e) => {
    const parts = (e.when || '').split('·').map(s => s.trim());
    let dt = null;
    if (parts.length >= 2) {
      const md = parts[1].split(' ');
      const month = MONTHS[md[0]];
      const day = parseInt(md[1], 10);
      if (month != null && Number.isFinite(day)) {
        const time = parts[2] || '';
        const m = time.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
        let h = m ? parseInt(m[1], 10) : 0;
        const min = m && m[2] ? parseInt(m[2], 10) : 0;
        if (m && /pm/i.test(m[3]) && h < 12) h += 12;
        if (m && /am/i.test(m[3]) && h === 12) h = 0;
        dt = new Date(Date.UTC(yearGuess(month), month, day, h, min));
      }
    }
    const uid = `${e.id}@jamradar`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    if (dt) {
      const end = new Date(dt.getTime() + 3 * 60 * 60 * 1000);  // 3-hour default
      lines.push(`DTSTART:${fmt(dt)}`);
      lines.push(`DTEND:${fmt(end)}`);
    } else {
      // All-day fallback for unparseable when-strings.
      const today = new Date();
      const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
      lines.push(`DTSTART;VALUE=DATE:${ymd}`);
    }
    lines.push(`SUMMARY:${escapeICS(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeICS(e.location)}`);
    if (e.desc)     lines.push(`DESCRIPTION:${escapeICS(e.desc)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
function escapeICS(s) {
  return String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
}

// ───────────── GEAR ─────────────
function GearScreen({ prefs }) {
  // Default the gear filter to "all", but bias the visible deals to user's sports.
  const [filter, setFilter] = React.useState('all');

  // Pull live deals from Supabase (auto-approved by the ingest pipeline).
  // Once even one real deal lands we hide the seed list — testers shouldn't
  // see the "Sweet Skis · CAPiTA Mercury 155" placeholders sitting next to
  // real Tactics products.
  const [liveDeals, setLiveDeals] = React.useState([]);
  const [dealsLoaded, setDealsLoaded] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    if (typeof window.JR_FETCH_GEAR_DEALS !== 'function') {
      setDealsLoaded(true);
      return;
    }
    window.JR_FETCH_GEAR_DEALS().then(rows => {
      if (cancelled) return;
      setLiveDeals(Array.isArray(rows) ? rows : []);
      setDealsLoaded(true);
    }).catch(() => { if (!cancelled) setDealsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const allDeals = React.useMemo(() => {
    // Use live data when we have it; only fall back to seed data when the
    // fetch resolved to an empty array (Supabase not configured / nothing
    // visible). Hides the prototype placeholders behind real product.
    if (liveDeals.length > 0) return liveDeals;
    if (!dealsLoaded) return [];           // briefly empty during the fetch
    return GEAR_DEALS;                     // genuinely no live deals → fall back
  }, [liveDeals, dealsLoaded]);

  const sportPool = prefs?.sports?.length
    ? allDeals.filter(g => prefs.sports.includes(g.sport))
    : allDeals;
  const filtered = filter === 'all' ? sportPool : sportPool.filter(g => g.sport === filter);

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 18px 14px' }}>
        <div className="mono" style={{
          fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
          color: 'var(--fg-dim)',
        }}>Local · Affiliate · Sponsor</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          letterSpacing: '-0.025em', marginTop: 2, marginBottom: 14,
        }}>Gear deals</div>

        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          marginLeft: -18, marginRight: -18,
          paddingLeft: 18, paddingRight: 18,
        }} className="jr-scroll">
          <PillChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={sportPool.length}/>
          {SPORTS.filter(s => sportPool.some(g => g.sport === s.id)).map(s => (
            <PillChip key={s.id}
              active={filter === s.id}
              onClick={() => setFilter(s.id)}
              label={s.label}
              icon={s.icon}
              count={sportPool.filter(g => g.sport === s.id).length}/>
          ))}
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 100px' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--fg-muted)',
            border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>◌</div>
            No deals for your sports yet.
          </div>
        ) : (
          <>
            {/* Hero deal */}
            {filtered[0] && <GearHero deal={filtered[0]}/>}

            {filtered.length > 1 && (
              <>
                <SectionLabel kicker="·" label="More deals" sub={`${filtered.length - 1} matching your sports`} style={{ marginTop: 22 }}/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {filtered.slice(1).map(d => <GearCard key={d.id} deal={d}/>)}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}

function GearHero({ deal }) {
  const Wrap = deal.reg_link
    ? (props) => <a href={deal.reg_link} target="_blank" rel="noopener noreferrer sponsored" style={{ color: 'inherit', textDecoration: 'none' }} {...props}/>
    : (props) => <div {...props}/>;
  return (
    <Wrap style={{
      borderRadius: 'var(--r-md)', overflow: 'hidden',
      border: '1px solid var(--line-soft)',
      background: 'var(--bg-surface)',
      display: 'block',
    }}>
      <div className="poster-ph" style={{
        height: 160, position: 'relative',
        background: 'linear-gradient(135deg, oklch(0.32 0.04 95) 0%, oklch(0.20 0.02 240) 100%)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="mono" style={{
            fontSize: 11, color: 'oklch(1 0 0 / 0.3)',
            letterSpacing: 0.12, textTransform: 'uppercase',
          }}>[ product shot ]</span>
        </div>
        <div style={{
          position: 'absolute', top: 12, left: 12,
          display: 'flex', gap: 6,
        }}>
          <span className="bib">{deal.kind}</span>
          {deal.sponsored && (
            <span className="bib" style={{
              borderColor: 'var(--hot)', color: 'var(--hot)',
              background: 'oklch(0.72 0.20 35 / 0.1)',
            }}>Sponsored</span>
          )}
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--accent)', color: 'var(--accent-ink)',
          borderRadius: 4, padding: '6px 9px',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
        }}>−{deal.off}%</div>
      </div>
      <div style={{ padding: 14 }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', letterSpacing: 0.06 }}>
          {deal.shop}{deal.distanceKm != null ? ` · ${deal.distanceKm} km` : ''}
        </div>
        <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4, lineHeight: 1.25 }}>{deal.title}</div>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
            color: 'var(--accent)', letterSpacing: '-0.02em',
          }}>${deal.sale}</span>
          <span className="mono" style={{
            fontSize: 12, color: 'var(--fg-dim)',
            textDecoration: 'line-through',
          }}>${deal.original}</span>
          <span style={{ flex: 1 }}/>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 12 }}>
            View deal {Icon.ext()}
          </span>
        </div>
      </div>
    </Wrap>
  );
}

function GearCard({ deal }) {
  // Live deals carry a reg_link to the actual product page; seeded deals don't.
  // Wrap the whole card in an <a> when we have one so taps go to the shop.
  const Wrap = deal.reg_link
    ? (props) => <a href={deal.reg_link} target="_blank" rel="noopener noreferrer sponsored" style={{ color: 'inherit', textDecoration: 'none' }} {...props}/>
    : (props) => <div {...props}/>;
  return (
    <Wrap style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--line-soft)',
      borderRadius: 'var(--r-md)', overflow: 'hidden',
      display: 'block',
    }}>
      <div className="poster-ph" style={{
        height: 90, position: 'relative',
        background: `linear-gradient(135deg, oklch(0.32 0.03 ${deal.sport === 'snowboard' ? 230 : 60}) 0%, oklch(0.20 0.02 240) 100%)`,
      }}>
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'var(--accent)', color: 'var(--accent-ink)',
          borderRadius: 4, padding: '3px 6px',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        }}>−{deal.off}%</div>
        {deal.sponsored && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            fontFamily: 'var(--font-mono)', fontSize: 8,
            color: 'oklch(1 0 0 / 0.7)',
            letterSpacing: 0.1, textTransform: 'uppercase',
          }}>SPON</div>
        )}
      </div>
      <div style={{ padding: 10 }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)' }}>
          {deal.shop}
        </div>
        <div style={{ fontWeight: 600, fontSize: 12, marginTop: 3, lineHeight: 1.25,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{deal.title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
            color: 'var(--accent)',
          }}>${deal.sale}</span>
          <span className="mono" style={{
            fontSize: 10, color: 'var(--fg-dim)',
            textDecoration: 'line-through',
          }}>${deal.original}</span>
        </div>
      </div>
    </Wrap>
  );
}

Object.assign(window, { DiscoverScreen, MapScreen, SavedScreen, GearScreen, ListEventRow, SectionLabel });
