// JamRadar — Detail, Organizer, Profile, Notifications, CreateEvent

const { NOTIFICATIONS, SPORTS: _SPORTS, EVENT_TYPES: _ETYPES } = window.JR_DATA;

// Share an event via the OS share sheet (Web Share API), falling back to
// clipboard + a toast on platforms without it (most desktop browsers).
async function shareEvent(e) {
  const url = `${location.origin}/JamRadar.html?event=${encodeURIComponent(e.id)}`;
  const text = `${e.title} · ${e.when} · ${e.location || ''}`;
  const payload = { title: e.title, text, url };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Link copied' } }));
      return;
    }
    // Last-resort: open a mailto with the URL prefilled.
    location.href = `mailto:?subject=${encodeURIComponent(e.title)}&body=${encodeURIComponent(text + '\n' + url)}`;
  } catch (err) {
    if (err.name === 'AbortError') return; // user dismissed share sheet — fine.
    console.warn('[JamRadar] share failed:', err);
  }
}
window.shareEvent = shareEvent;

// ───────────── EVENT DETAIL ─────────────
function EventDetail({ id, events, onBack, onSave, savedIds, goingIds, onToggleGoing, followedOrgs, onToggleFollow, onOpenOrg }) {
  const e = events.find(x => x.id === id);
  if (!e) return null;
  const saved = savedIds.includes(id);
  const going = goingIds?.includes(id);
  const isFollowed = followedOrgs?.includes(e.org);
  const [tab, setTab] = React.useState('info');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Hero */}
      <div className="poster-ph" style={{
        position: 'relative',
        height: 280,
        background: `linear-gradient(135deg, oklch(0.40 0.06 ${e.color}) 0%, oklch(0.18 0.02 240) 100%)`,
      }}>
        <svg width="100%" height="100%" style={{
          position: 'absolute', inset: 0, opacity: 0.2,
          // pointer-events: none so the SVG topo lines never absorb taps
          // intended for the back / share / save buttons sitting above it.
          pointerEvents: 'none',
        }}>
          <g fill="none" stroke="white" strokeWidth="1">
            <path d="M-20 60 Q 80 30 200 60 T 420 50"/>
            <path d="M-20 100 Q 80 70 200 100 T 420 90"/>
            <path d="M-20 140 Q 80 110 200 140 T 420 130"/>
            <path d="M-20 180 Q 80 150 200 180 T 420 170"/>
            <path d="M-20 220 Q 80 190 200 220 T 420 210"/>
          </g>
        </svg>

        {/* top bar */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0,
          padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
        }}>
          <BackButton onClick={onBack} variant="pill"/>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => shareEvent(e)} style={{
              appearance: 'none', border: 'none', cursor: 'pointer',
              width: 40, height: 40, borderRadius: 999,
              background: 'oklch(0 0 0 / 0.4)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
            }}>{Icon.share(18)}</button>
            <button onClick={() => onSave(id)} style={{
              appearance: 'none', border: 'none', cursor: 'pointer',
              width: 40, height: 40, borderRadius: 999,
              background: saved ? 'var(--accent)' : 'oklch(0 0 0 / 0.4)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: saved ? 'var(--accent-ink)' : 'white',
            }}>{Icon.bookmark(18, saved)}</button>
          </div>
        </div>

        {/* bib + title */}
        <div style={{
          position: 'absolute', left: 18, right: 18, bottom: 18,
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <span className="bib">{e.type}</span>
            {e.live && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 4,
                background: 'var(--hot-soft)', color: 'var(--hot)',
                fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 700,
              }}>
                <span className="pulse-dot" />Live
              </span>
            )}
          </div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 32, letterSpacing: '-0.025em', lineHeight: 1.05,
            color: 'white', textShadow: '0 2px 18px oklch(0 0 0 / 0.5)',
          }}>{e.title}</h1>
          <div className="mono" style={{
            fontSize: 11, color: 'oklch(1 0 0 / 0.7)', marginTop: 8,
            letterSpacing: 0.06, textTransform: 'uppercase',
          }}>{e.coords}</div>
        </div>
      </div>

      {/* Body */}
      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 120px' }}>
        {/* Org + sport */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
          marginBottom: 16,
        }}>
          <button
            onClick={() => onOpenOrg?.(e.org)}
            style={{
              appearance: 'none', border: 'none', cursor: 'pointer',
              background: 'transparent', padding: 0,
              display: 'flex', alignItems: 'center', gap: 10, flex: 1,
              color: 'var(--fg)', textAlign: 'left',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--bg-surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)',
              fontWeight: 700,
            }}>{e.org.split(' ').map(s => s[0]).slice(0, 2).join('')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{e.org}</span>
                {e.orgVerified && (
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--accent)', color: 'var(--accent-ink)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                  }}>✓</span>
                )}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)' }}>
                Verified organizer · {e.going} going
              </div>
            </div>
          </button>
          <button
            onClick={() => onToggleFollow?.(e.org)}
            className="btn-ghost"
            style={{
              padding: '6px 12px', fontSize: 12,
              background: isFollowed ? 'var(--accent-soft)' : 'transparent',
              borderColor: isFollowed ? 'var(--accent)' : 'var(--line)',
              color: isFollowed ? 'var(--accent)' : 'var(--fg)',
            }}
          >{isFollowed ? 'Following' : 'Follow'}</button>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginBottom: 18,
        }}>
          <StatCell label="When"        value={e.when}/>
          <StatCell label="Where"       value={e.location}/>
          <StatCell label="Skill"       value={e.skill}/>
          <StatCell label="Cost"        value={e.cost}/>
          {e.prize && <StatCell label="Prize" value={e.prize} highlight/>}
          {e.deadline && <StatCell label="Deadline" value={e.deadline} hot/>}
        </div>

        {/* Tabs — Updates / Results only show when the event has real entries */}
        <div style={{
          display: 'flex', gap: 18, borderBottom: '1px solid var(--line-soft)',
          marginBottom: 16,
        }}>
          {(() => {
            const tabs = ['info', 'crew'];
            if (e.results?.length) tabs.push('results');
            if (e.updates?.length) tabs.push('updates');
            return tabs;
          })().map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              appearance: 'none', border: 'none', background: 'transparent',
              padding: '8px 0', cursor: 'pointer',
              color: tab === t ? 'var(--accent)' : 'var(--fg-dim)',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              letterSpacing: 0.1, textTransform: 'uppercase',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}>{t}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div>
            <p style={{
              margin: 0, fontSize: 14, lineHeight: 1.55,
              color: 'var(--fg-muted)', marginBottom: 18,
              textWrap: 'pretty',
            }}>{e.desc}</p>

            {e.sponsors.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div className="mono" style={{
                  fontSize: 10, color: 'var(--fg-dim)', letterSpacing: 0.1,
                  textTransform: 'uppercase', marginBottom: 8,
                }}>Sponsors</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {e.sponsors.map(s => (
                    <span key={s} style={{
                      padding: '6px 10px', borderRadius: 4,
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--line-soft)',
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--fg-muted)',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Mini map */}
            <div style={{
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              border: '1px solid var(--line-soft)',
              height: 130, position: 'relative',
              background: 'oklch(0.18 0.02 240)',
            }}>
              <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
                <g fill="none" stroke="oklch(0.4 0.02 240)" strokeWidth="0.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ellipse key={i} cx="50%" cy="50%" rx={20 + i * 25} ry={14 + i * 18}/>
                  ))}
                </g>
              </svg>
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{
                  background: 'var(--accent)', color: 'var(--accent-ink)',
                  padding: '4px 8px', borderRadius: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                  letterSpacing: 0.06, textTransform: 'uppercase',
                }}>{e.distanceKm}km</div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent)', marginTop: 4,
                  boxShadow: '0 0 0 4px oklch(0.88 0.18 100 / 0.25)',
                }}/>
              </div>
            </div>
          </div>
        )}

        {tab === 'crew' && (
          <div>
            <div style={{
              padding: 24, textAlign: 'center',
              background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
              borderRadius: 'var(--r-md)', marginBottom: 16,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36,
                color: 'var(--accent)', letterSpacing: '-0.02em',
              }}>
                {(e.going || 0) + (going ? 1 : 0)}
              </div>
              <div className="mono" style={{
                fontSize: 11, color: 'var(--fg-dim)',
                letterSpacing: 0.1, textTransform: 'uppercase', marginTop: 4,
              }}>riders going</div>
              {going && (
                <div className="mono" style={{
                  fontSize: 10, color: 'var(--accent)', marginTop: 8,
                }}>✓ you're in</div>
              )}
            </div>
            <button
              onClick={() => onToggleGoing?.(id)}
              className="btn-ghost"
              style={{
                width: '100%',
                background: going ? 'var(--accent-soft)' : 'transparent',
                borderColor: going ? 'var(--accent)' : 'var(--line)',
                color: going ? 'var(--accent)' : 'var(--fg)',
              }}
            >{going ? "You're in ✓" : "I'm going"}</button>
          </div>
        )}

        {tab === 'updates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(e.updates || []).map((u, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 10,
                background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
              }}>
                <div className="mono" style={{
                  fontSize: 9, color: 'var(--fg-dim)',
                  letterSpacing: 0.1, textTransform: 'uppercase',
                }}>{u.time}</div>
                <div style={{ fontSize: 13, marginTop: 4, color: 'var(--fg-muted)' }}>{u.text}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'results' && e.results?.length && (
          <ResultsList results={e.results}/>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'oklch(0.18 0.018 240 / 0.92)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--line-soft)',
        padding: '14px 16px 30px',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <button onClick={() => onSave(id)} className="btn-ghost" style={{
          width: 48, height: 48, padding: 0, borderRadius: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: saved ? 'var(--accent)' : 'var(--fg)',
          borderColor: saved ? 'var(--accent)' : 'var(--line)',
        }}>{Icon.bookmark(18, saved)}</button>
        <button
          onClick={() => {
            // Match the button-label logic exactly so behavior never diverges
            // from what the label promises.
            const looksFree = !e.cost
              || e.cost === 'Free'
              || (typeof e.cost === 'string' && e.cost.toLowerCase().startsWith('free'));
            if (looksFree || !e.regLink) {
              onToggleGoing?.(id);
              return;
            }
            // Paid + real link → take them out to register.
            window.open(e.regLink, '_blank', 'noopener,noreferrer');
          }}
          className="btn-accent"
          style={{ flex: 1 }}
        >
          {(() => {
            // Free / no-cost / unknown-cost events: just toggle going.
            const looksFree = !e.cost
              || e.cost === 'Free'
              || (typeof e.cost === 'string' && e.cost.toLowerCase().startsWith('free'));
            if (looksFree) return going ? "You're in ✓" : "I'm going";
            // Paid event with no real registration link → also just toggle going,
            // because the button can't actually take them anywhere.
            if (!e.regLink) return going ? "You're in ✓" : "I'm going";
            // Paid + has link → outbound to register.
            return `Register · ${e.cost}`;
          })()}
        </button>
      </div>
    </div>
  );
}

// Podium-style results display: 1st 2nd 3rd visualised, then any remaining
// places listed below. Empty if there are no results yet (the tab itself is
// hidden in that case so this branch never renders).
function ResultsList({ results }) {
  const podium = results.filter(r => r.place <= 3).sort((a, b) => a.place - b.place);
  const rest = results.filter(r => r.place > 3).sort((a, b) => a.place - b.place);

  // Order podium visually: 2nd · 1st · 3rd
  const visualOrder = [
    podium.find(r => r.place === 2),
    podium.find(r => r.place === 1),
    podium.find(r => r.place === 3),
  ].filter(Boolean);

  const heights  = { 1: 88, 2: 64, 3: 48 };
  const colors   = { 1: 'var(--accent)', 2: 'oklch(0.78 0.04 240)', 3: 'oklch(0.65 0.10 30)' };
  const inkColor = { 1: 'var(--accent-ink)', 2: 'var(--bg-deep)', 3: 'var(--bg-deep)' };

  return (
    <div>
      {/* Podium */}
      {visualOrder.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: 8, padding: '24px 0 16px',
        }}>
          {visualOrder.map(r => (
            <div key={r.place} style={{
              flex: 1, maxWidth: 110,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
                marginBottom: 6, textAlign: 'center', maxWidth: 100,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.rider}</div>
              <div style={{
                width: '100%', height: heights[r.place],
                background: colors[r.place], color: inkColor[r.place],
                borderRadius: '8px 8px 0 0',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: 8,
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
                letterSpacing: '-0.02em',
              }}>{r.place}</div>
            </div>
          ))}
        </div>
      )}

      {/* Detail rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {[...podium, ...rest].map((r, i) => (
          <div key={i} style={{
            padding: 12, borderRadius: 10,
            background: 'var(--bg-surface)',
            border: `1px solid ${r.place === 1 ? 'var(--accent)' : 'var(--line-soft)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: r.place <= 3 ? colors[r.place] : 'var(--bg-surface-2)',
              color: r.place <= 3 ? inkColor[r.place] : 'var(--fg-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
              flexShrink: 0,
            }}>{r.place}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{r.rider}</div>
              {r.note && (
                <div className="mono" style={{
                  fontSize: 10, color: 'var(--fg-dim)', marginTop: 2,
                }}>{r.note}</div>
              )}
            </div>
            {r.prize && (
              <div className="mono" style={{
                fontSize: 10, letterSpacing: 0.06, textTransform: 'uppercase',
                color: 'var(--accent)', textAlign: 'right',
              }}>{r.prize}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCell({ label, value, highlight, hot }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: hot ? 'var(--hot-soft)' : 'var(--bg-surface)',
      border: `1px solid ${hot ? 'oklch(0.72 0.20 35 / 0.4)' : 'var(--line-soft)'}`,
    }}>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
        color: hot ? 'var(--hot)' : 'var(--fg-dim)',
      }}>{label}</div>
      <div style={{
        marginTop: 4, fontSize: 14, fontWeight: 600,
        color: highlight ? 'var(--accent)' : hot ? 'var(--hot)' : 'var(--fg)',
        lineHeight: 1.2,
      }}>{value}</div>
    </div>
  );
}

// ───────────── PROFILE ─────────────
function ProfileScreen({ prefs, savedIds, goingIds, events, user, onOpenAuth, onSignOut, onSetPrefs, onSwitchToOrgMode, onSwitchToShopMode, onSwitchToAdminMode, onResetAll }) {
  const [editing, setEditing] = React.useState(null); // 'sports' | 'radius' | 'types' | 'notif' | 'skill'

  const sportLabels = (prefs?.sports || [])
    .map(id => _SPORTS.find(s => s.id === id)?.label)
    .filter(Boolean)
    .join(', ') || 'None';
  const notifLabel = ({
    instant: 'Instant pings',
    daily:   'Daily digest',
    weekly:  'Weekly digest',
    saved:   'Only saved events',
    reg:     'Only deadlines',
  })[prefs?.notif] || prefs?.notif || '—';

  const onRadarCount = events.filter(e => e.status !== 'pending'
    && (!prefs?.sports?.length || prefs.sports.includes(e.sport))
    && (e.distanceKm == null || e.distanceKm <= (prefs?.radius || 250))
  ).length;

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 18px 14px' }}>
        <div className="mono" style={{
          fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
          color: 'var(--fg-dim)',
        }}>Account</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          letterSpacing: '-0.025em', marginTop: 2,
        }}>You</div>
      </div>
      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 100px' }}>
        {/* Profile card — adapts to signed-in vs anonymous */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
          borderRadius: 'var(--r-md)', padding: 16, marginBottom: 18,
          display: 'flex', gap: 14, alignItems: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: user
              ? 'linear-gradient(135deg, var(--accent), oklch(0.65 0.20 25))'
              : 'var(--bg-surface-2)',
            border: user ? 'none' : '1px dashed var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
            color: user ? 'var(--accent-ink)' : 'var(--fg-dim)',
          }}>{user ? (user.email?.[0]?.toUpperCase() || 'U') : '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              overflow: 'hidden',
            }}>
              <span style={{
                fontWeight: 600, fontSize: 16,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, minWidth: 0,
              }}>{prefs?.displayName
                || (prefs?.accountType === 'organizer' && prefs?.organizerName)
                || (user ? (user.email || 'Signed in') : 'Guest')}</span>
              {prefs?.accountType === 'organizer' && (
                <span className="mono" style={{
                  flexShrink: 0,
                  padding: '3px 8px', borderRadius: 4,
                  background: 'var(--accent)', color: 'var(--accent-ink)',
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: 0.08, textTransform: 'uppercase',
                }}>Org</span>
              )}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2 }}>
              {prefs?.city || 'Toronto'} · {prefs?.radius || 50} km radar
              {prefs?.openToRide && (
                <span style={{ color: 'var(--accent)', marginLeft: 8 }}>· ● open to ride</span>
              )}
            </div>
          </div>
          {user ? (
            <button onClick={onSignOut} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
              Sign out
            </button>
          ) : (
            <button onClick={onOpenAuth} className="btn-accent" style={{ padding: '8px 14px', fontSize: 13 }}>
              Sign in
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22 }}>
          {[
            [savedIds.length, 'Saved'],
            [goingIds?.length || 0, 'Going'],
            [onRadarCount, 'On radar'],
          ].map(([n, l]) => (
            <div key={l} style={{
              padding: 12, borderRadius: 10, textAlign: 'center',
              background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>{n}</div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 0.1, textTransform: 'uppercase', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <SectionLabel kicker="Prefs" label="Your radar" sub="Tap any to edit"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 18 }}>
          <PrefRow label="Display name" value={prefs?.displayName || 'Guest'} onClick={() => setEditing('displayName')}/>
          <PrefRow label="Sports"        value={sportLabels} onClick={() => setEditing('sports')}/>
          <PrefRow label="Radius"        value={`${prefs?.radius || 50} km`} onClick={() => setEditing('radius')}/>
          <PrefRow label="Event types"   value={`${prefs?.types?.length || 0} selected`} onClick={() => setEditing('types')}/>
          <PrefRow label="Notifications" value={notifLabel} onClick={() => setEditing('notif')}/>
          <PrefRow label="Skill level"   value={prefs?.skill || 'Intermediate'} onClick={() => setEditing('skill')}/>
          <ToggleRow
            label="Open to ride"
            sub="Show me in Riders near you"
            value={!!prefs?.openToRide}
            onChange={(v) => onSetPrefs({ openToRide: v })}/>
        </div>

        <SectionLabel kicker="Wins" label="Your accolades" sub="Tap to add results, sponsorships, podiums"/>
        <AccoladesList
          items={prefs?.accolades || []}
          onEdit={() => setEditing('accolades')}
        />
        <div style={{ height: 22 }}/>

        <SectionLabel kicker="Get the most" label="Set up your radar"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          <NotificationPermissionRow/>
          <InstallPromptRow/>
        </div>

        <SectionLabel kicker="Modes" label="For organizers, shops, and admins"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ModeCard
            title="Switch to organizer mode" sub="Post events, see analytics"
            onClick={onSwitchToOrgMode}
          />
          <ModeCard
            title="Switch to shop mode" sub="Post gear deals, see your dashboard"
            onClick={onSwitchToShopMode}
          />
          <ModeCard
            title="Switch to admin mode" sub="Approve events, verify orgs"
            onClick={onSwitchToAdminMode}
          />
        </div>

        <button onClick={() => { if (confirm('Reset all local data and re-run onboarding?')) onResetAll?.(); }} style={{
          appearance: 'none', cursor: 'pointer',
          marginTop: 24, padding: '10px 14px', width: '100%',
          background: 'transparent', border: '1px dashed var(--line)',
          borderRadius: 'var(--r-md)', color: 'var(--fg-dim)',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: 0.06, textTransform: 'uppercase',
        }}>Reset all local data</button>
      </div>

      {editing && (
        <PrefEditSheet
          field={editing}
          prefs={prefs}
          onClose={() => setEditing(null)}
          onSave={(patch) => { onSetPrefs?.(patch); setEditing(null); }}
        />
      )}
    </div>
  );
}

function PrefRow({ label, value, onClick }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer', width: '100%',
      padding: '14px 14px',
      background: 'var(--bg-surface)', border: 'none',
      borderBottom: '1px solid var(--line-soft)',
      display: 'flex', alignItems: 'center', gap: 10,
      color: 'var(--fg)', textAlign: 'left',
    }}>
      <span className="mono" style={{
        fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase',
        color: 'var(--fg-dim)', minWidth: 90,
      }}>{label}</span>
      <span style={{
        flex: 1, fontSize: 14, fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
      <span style={{ color: 'var(--fg-muted)' }}>{Icon.arrowR(14)}</span>
    </button>
  );
}

// Asks the OS for notification permission so JamRadar can fire local
// notifications when the app is open (new featured events, deadlines).
// True background push (when the app is closed) is a future feature — needs
// VAPID keys + a server endpoint to send pushes through the push service.
// This row is honest about the current scope.
function NotificationPermissionRow() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [status, setStatus] = React.useState(supported ? Notification.permission : 'unsupported');

  const ask = async () => {
    if (!supported || status === 'granted') return;
    const result = await Notification.requestPermission();
    setStatus(result);
    if (result === 'granted') {
      // A "yes you're set up" ping so the user knows the channel works.
      try {
        new Notification('JamRadar', {
          body: "Notifications are on. We'll ping you while the app is open.",
          icon: '/icon.svg',
        });
      } catch {}
      window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Notifications enabled' } }));
    } else if (result === 'denied') {
      window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Allow in your browser settings' } }));
    }
  };

  const meta = ({
    granted: { label: 'Notifications on', sub: 'Pings while JamRadar is open', cta: '✓' },
    denied:  { label: 'Notifications blocked', sub: 'Enable in your browser settings', cta: 'Help' },
    default: { label: 'Turn on notifications', sub: 'Pings for matching events while the app is open', cta: 'Enable' },
    unsupported: { label: 'Notifications unavailable', sub: "Your browser doesn't support notifications", cta: '—' },
  })[status] || { label: 'Notifications', sub: '', cta: '?' };

  return (
    <button
      onClick={ask}
      disabled={status !== 'default'}
      style={{
        appearance: 'none', cursor: status === 'default' ? 'pointer' : 'default',
        width: '100%', padding: 14, borderRadius: 'var(--r-md)',
        background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
        display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textAlign: 'left',
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: status === 'granted' ? 'var(--accent-soft)' : 'var(--bg-surface-2)',
        color: status === 'granted' ? 'var(--accent)' : 'var(--fg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.bell(18)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>{meta.sub}</div>
      </div>
      <span className="mono" style={{
        fontSize: 11, padding: '4px 10px', borderRadius: 999,
        background: status === 'granted' ? 'var(--accent)' : 'transparent',
        color: status === 'granted' ? 'var(--accent-ink)' : 'var(--accent)',
        border: status === 'granted' ? 'none' : '1px solid var(--accent)',
        letterSpacing: 0.06, textTransform: 'uppercase',
      }}>{meta.cta}</span>
    </button>
  );
}

// Show "Add to Home Screen" only on browsers that haven't already installed.
// We can detect installed-as-PWA via display-mode standalone.
function InstallPromptRow() {
  const installed = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

  // Capture the beforeinstallprompt event for browsers that support it (Chrome/Edge),
  // so we can trigger install on a tap.
  const [deferredPrompt, setDeferred] = React.useState(null);
  React.useEffect(() => {
    if (installed) return;
    const handler = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [installed]);

  if (installed) return null;  // already done — hide

  const tap = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferred(null);
    } else {
      // iOS Safari: no programmatic install; show toast with instructions.
      window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: 'Tap Share → Add to Home Screen' } }));
    }
  };

  return (
    <button onClick={tap} style={{
      appearance: 'none', cursor: 'pointer', width: '100%',
      padding: 14, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
      display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textAlign: 'left',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.plus(18)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Add to Home Screen</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
          Use JamRadar like a native app
        </div>
      </div>
      <span style={{ color: 'var(--fg-muted)' }}>{Icon.arrowR(16)}</span>
    </button>
  );
}

// Editor used inside PrefEditSheet for the user's accolades list.
function AccoladesEditor({ items, onChange }) {
  const update = (i, key, val) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [key]: val };
    onChange(copy);
  };
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const add = () => onChange([...items, { title: '', event: '', year: new Date().getFullYear() }]);

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
        Wins, podium finishes, sponsorships, features. They show up on your profile and on your
        Rider card if you're open to ride.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((a, i) => (
          <div key={i} style={{
            padding: 12, borderRadius: 'var(--r-md)',
            background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={a.title}
                onChange={(e) => update(i, 'title', e.target.value)}
                placeholder="e.g. 1st Place"
                style={{
                  flex: 1, background: 'var(--bg-surface-2)',
                  border: '1px solid var(--line-soft)', borderRadius: 8,
                  padding: '8px 10px', color: 'var(--fg)', fontSize: 13,
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                }}/>
              <button onClick={() => remove(i)} aria-label="Remove" style={{
                appearance: 'none', cursor: 'pointer', border: 'none',
                background: 'transparent', color: 'var(--fg-muted)',
                fontSize: 18, padding: '0 4px',
              }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={a.event}
                onChange={(e) => update(i, 'event', e.target.value)}
                placeholder="Event name"
                style={{
                  flex: 2, background: 'var(--bg-surface-2)',
                  border: '1px solid var(--line-soft)', borderRadius: 8,
                  padding: '8px 10px', color: 'var(--fg)', fontSize: 13,
                }}/>
              <input
                type="number"
                value={a.year || ''}
                onChange={(e) => update(i, 'year', parseInt(e.target.value, 10) || '')}
                placeholder="Year"
                style={{
                  flex: 1, background: 'var(--bg-surface-2)',
                  border: '1px solid var(--line-soft)', borderRadius: 8,
                  padding: '8px 10px', color: 'var(--fg)', fontSize: 13,
                  width: 70,
                }}/>
            </div>
          </div>
        ))}
      </div>
      <button onClick={add} style={{
        appearance: 'none', cursor: 'pointer',
        marginTop: 12, padding: '12px 16px', width: '100%',
        background: 'transparent', color: 'var(--accent)',
        border: '1px dashed var(--accent)', borderRadius: 'var(--r-md)',
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
      }}>+ Add accolade</button>
    </div>
  );
}

// Inline iOS-style toggle row.
function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div style={{
      width: '100%', padding: '14px 14px',
      background: 'var(--bg-surface)', border: 'none',
      borderBottom: '1px solid var(--line-soft)',
      display: 'flex', alignItems: 'center', gap: 10,
      color: 'var(--fg)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{
          fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase',
          color: 'var(--fg-dim)',
        }}>{label}</div>
        <div style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          appearance: 'none', cursor: 'pointer',
          width: 44, height: 26, borderRadius: 999,
          background: value ? 'var(--accent)' : 'var(--bg-surface-2)',
          border: '1px solid var(--line-soft)',
          position: 'relative', flexShrink: 0,
          transition: 'background .15s ease',
        }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 20 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: value ? 'var(--accent-ink)' : 'var(--fg-muted)',
          transition: 'left .15s ease',
        }}/>
      </button>
    </div>
  );
}

// Compact list of the user's wins / podiums / sponsorships. Tap anywhere to
// open the edit sheet which lets them add or remove rows.
function AccoladesList({ items, onEdit }) {
  if (items.length === 0) {
    return (
      <button onClick={onEdit} style={{
        appearance: 'none', cursor: 'pointer', width: '100%',
        padding: '24px 16px', borderRadius: 'var(--r-md)',
        background: 'transparent', border: '1px dashed var(--line)',
        color: 'var(--fg-muted)', textAlign: 'center', fontSize: 13,
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{ fontSize: 22, marginBottom: 6, color: 'var(--accent)' }}>★</div>
        Add your first podium
        <div className="mono" style={{
          fontSize: 10, color: 'var(--fg-dim)', marginTop: 6,
          letterSpacing: 0.06, textTransform: 'uppercase',
        }}>Tap to edit</div>
      </button>
    );
  }
  return (
    <button onClick={onEdit} style={{
      appearance: 'none', cursor: 'pointer', width: '100%',
      padding: 0, border: 'none', background: 'transparent',
      textAlign: 'left',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.slice(0, 5).map((a, i) => (
          <div key={i} style={{
            padding: 12, borderRadius: 10,
            background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>★</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600, fontSize: 13,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{a.title}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
                {a.event}{a.year ? ` · ${a.year}` : ''}
              </div>
            </div>
          </div>
        ))}
        {items.length > 5 && (
          <div className="mono" style={{
            fontSize: 11, color: 'var(--fg-dim)', textAlign: 'center', padding: 6,
          }}>+ {items.length - 5} more</div>
        )}
      </div>
    </button>
  );
}

function ModeCard({ title, sub, onClick }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer', width: '100%',
      padding: 14, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
      display: 'flex', alignItems: 'center', gap: 12,
      color: 'var(--fg)', textAlign: 'left',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.spark(18)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: 'var(--fg-muted)' }}>{Icon.arrowR(16)}</span>
    </button>
  );
}

// One-prop edit sheet for any single pref.
function PrefEditSheet({ field, prefs, onClose, onSave }) {
  const [draft, setDraft] = React.useState(() => ({
    sports: prefs.sports || [],
    radius: prefs.radius || 50,
    types:  prefs.types  || [],
    notif:  prefs.notif  || 'instant',
    skill:  prefs.skill  || 'Intermediate',
    city:   prefs.city   || 'Toronto',
    displayName: prefs.displayName || '',
    accolades:   prefs.accolades   || [],
  }));
  const toggle = (key, val) => setDraft(d => ({
    ...d,
    [key]: d[key].includes(val) ? d[key].filter(x => x !== val) : [...d[key], val],
  }));

  const titles = {
    sports: 'Your sports',
    radius: 'Radius',
    types:  'Event types',
    notif:  'Notifications',
    skill:  'Skill level',
    displayName: 'Display name',
    accolades:   'Your accolades',
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'oklch(0 0 0 / 0.5)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'jr-fade-in .2s ease forwards',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-base)', borderTop: '1px solid var(--line)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '14px 18px 22px', maxHeight: '78%',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 40px oklch(0 0 0 / 0.5)',
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--line)', margin: '0 auto 12px',
        }}/>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
          letterSpacing: '-0.02em', marginBottom: 14,
        }}>{titles[field]}</div>

        <div className="jr-scroll" style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}>
          {field === 'sports' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {_SPORTS.map(s => {
                const on = draft.sports.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggle('sports', s.id)} style={{
                    appearance: 'none', cursor: 'pointer', textAlign: 'left',
                    padding: 12, borderRadius: 10,
                    background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                    color: on ? 'var(--accent)' : 'var(--fg)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {field === 'radius' && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, color: 'var(--accent)', textAlign: 'center', marginBottom: 8 }}>
                {draft.radius} <span className="mono" style={{ fontSize: 14, color: 'var(--fg-dim)' }}>km</span>
              </div>
              <input type="range" min={5} max={500} step={5}
                value={draft.radius}
                onChange={(e) => setDraft(d => ({ ...d, radius: parseInt(e.target.value, 10) }))}
                style={{ width: '100%', accentColor: 'oklch(0.88 0.18 100)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)' }}>5 km</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)' }}>500 km</span>
              </div>
            </div>
          )}

          {field === 'types' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {_ETYPES.map(t => {
                const on = draft.types.includes(t);
                return (
                  <button key={t} onClick={() => toggle('types', t)} style={{
                    appearance: 'none', cursor: 'pointer',
                    padding: '8px 12px', borderRadius: 999, fontSize: 12,
                    background: on ? 'var(--accent)' : 'transparent',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    color: on ? 'var(--accent-ink)' : 'var(--fg)',
                  }}>{t}</button>
                );
              })}
            </div>
          )}

          {field === 'notif' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['instant', 'Instant alerts'],
                ['daily',   'Daily digest'],
                ['weekly',  'Weekly digest'],
                ['saved',   'Only saved events'],
                ['reg',     'Only deadlines'],
              ].map(([id, lbl]) => {
                const on = draft.notif === id;
                return (
                  <button key={id} onClick={() => setDraft(d => ({ ...d, notif: id }))} style={{
                    appearance: 'none', cursor: 'pointer', textAlign: 'left',
                    padding: 14, borderRadius: 'var(--r-md)',
                    background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                    color: on ? 'var(--accent)' : 'var(--fg)',
                    fontWeight: 600, fontSize: 14,
                  }}>{lbl}</button>
                );
              })}
            </div>
          )}

          {field === 'skill' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Beginner', 'Intermediate', 'Advanced', 'Pro'].map(lbl => {
                const on = draft.skill === lbl;
                return (
                  <button key={lbl} onClick={() => setDraft(d => ({ ...d, skill: lbl }))} style={{
                    appearance: 'none', cursor: 'pointer', textAlign: 'left',
                    padding: 14, borderRadius: 'var(--r-md)',
                    background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                    color: on ? 'var(--accent)' : 'var(--fg)',
                    fontWeight: 600, fontSize: 14,
                  }}>{lbl}</button>
                );
              })}
            </div>
          )}

          {field === 'displayName' && (
            <div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                Shown on your profile and (when you're open to ride) in Riders near you.
                Use whatever you'd want a stranger to call you at the lift.
              </p>
              <input
                value={draft.displayName}
                onChange={(e) => setDraft(d => ({ ...d, displayName: e.target.value }))}
                placeholder="e.g. Jay M."
                maxLength={32}
                style={{
                  width: '100%', background: 'var(--bg-surface)',
                  border: '1px solid var(--line-soft)', borderRadius: 10,
                  padding: '12px 14px', color: 'var(--fg)', fontSize: 15,
                  fontFamily: 'var(--font-display)', fontWeight: 500,
                }}
              />
            </div>
          )}

          {field === 'accolades' && (
            <AccoladesEditor
              items={draft.accolades}
              onChange={(items) => setDraft(d => ({ ...d, accolades: items }))}
            />
          )}
        </div>

        <button
          onClick={() => onSave({ [field]: draft[field] })}
          className="btn-accent"
          style={{ marginTop: 8 }}
        >Save</button>
      </div>
    </div>
  );
}

// ───────────── NOTIFICATIONS ─────────────
function NotificationsScreen({ onBack, readIds = [], dynamicNotifs = [], onMarkAllRead }) {
  // Dynamic notifications (auto-generated by store actions) prepend the seed list.
  const all = [...dynamicNotifs, ...NOTIFICATIONS];
  const unread = (n) => n.unread && !readIds.includes(n.id);
  const hasUnread = all.some(unread);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ padding: '14px 14px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <BackButton onClick={onBack}/>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
          Pings
        </div>
        <span style={{ flex: 1 }}/>
        <button
          onClick={onMarkAllRead}
          disabled={!hasUnread}
          className="btn-ghost"
          style={{
            padding: '6px 12px', fontSize: 12,
            opacity: hasUnread ? 1 : 0.4,
            cursor: hasUnread ? 'pointer' : 'default',
          }}
        >Mark all read</button>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 40px' }}>
        {all.map(n => {
          const isUnread = unread(n);
          return (
            <div key={n.id} style={{
              display: 'flex', gap: 12, padding: '14px 0',
              borderBottom: '1px solid var(--line-soft)',
              opacity: isUnread ? 1 : 0.65,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                background: isUnread ? 'var(--accent-soft)' : 'var(--bg-surface)',
                border: '1px solid var(--line-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isUnread ? 'var(--accent)' : 'var(--fg-dim)',
              }}>
                {n.kind === 'new' && Icon.spark(16)}
                {n.kind === 'deadline' && '⚑'}
                {n.kind === 'indoor' && '⬚'}
                {n.kind === 'gear' && Icon.tag(16)}
                {n.kind === 'changed' && '↻'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: isUnread ? 600 : 500,
                  color: 'var(--fg)',
                }}>{n.text}</div>
                <div className="mono" style={{
                  fontSize: 11, color: 'var(--fg-muted)', marginTop: 2,
                }}>{n.sub}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)', marginTop: 4 }}>{n.time}</div>
              </div>
              {isUnread && (
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--accent)', marginTop: 8, flexShrink: 0,
                }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── ORGANIZER DASHBOARD ─────────────
function OrgDashboard({ events, prefs, savedIdsAcrossUsers, followedOrgs, onToggleFollow, onCreateEvent, onEditEvent, onBack, onOpenEvent }) {
  // The user's organizer name from onboarding. Falls back to the prototype
  // constant only when no organizer signed up — required so the user-side
  // "create org account" flow can preview the dashboard with seed data.
  const ORG_NAME = (prefs?.organizerName?.trim()) ||
                   window.JR_CONFIG?.PROTOTYPE_ORG_NAME ||
                   'Blue Mountain Park Crew';
  const ORG_INITIALS = ORG_NAME.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'JR';
  const ORG_KIND = prefs?.organizerKind || 'Mountain';
  const myEvents = events.filter(e => e.org === ORG_NAME);
  // Only show this org's own events on the dashboard — no padding with others.
  const visible = myEvents;

  const statusFor = (e) => {
    if (e.status === 'pending') return 'PENDING';
    if (e.status === 'approved') return 'LIVE';
    if (e.org === ORG_NAME) return e.live ? 'LIVE' : 'SCHEDULED';
    return 'SCHEDULED';
  };

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <BackButton onClick={onBack}/>
          <div className="mono" style={{
            fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
            color: 'var(--fg-dim)',
          }}>Organizer</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14,
          }}>{ORG_INITIALS}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
              {ORG_NAME}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
              {prefs?.orgVerified ? 'Verified' : 'Unverified'} · {ORG_KIND} · {visible.length} event{visible.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 100px' }}>
        {/* KPIs — only the metrics we can actually compute from the store.
            Followers / reach require a follows table + analytics, neither
            of which exist yet. Show 2 honest cards, not 4 fake ones. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <KPICard
            label="Live events"
            value={String(myEvents.filter(e => e.status !== 'pending').length)}
            delta={`${myEvents.filter(e => e.status === 'pending').length} pending`}
          />
          <KPICard
            label="Going (total)"
            value={String(myEvents.reduce((sum, e) => sum + (e.going || 0), 0))}
            delta="across your events"
            up
          />
        </div>

        <SectionLabel kicker="Live" label="Your events" sub={`${visible.length} total`}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {visible.length === 0 ? (
            <div style={{
              padding: 24, textAlign: 'center', color: 'var(--fg-muted)',
              border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
              fontSize: 13,
            }}>
              No events yet — tap <b>Post event</b> to publish your first one.
            </div>
          ) : visible.map(ev => (
            <OrgEventRow key={ev.id} event={ev}
              // For events owned by this organizer, tapping opens Edit; for others, the public detail.
              onOpenEvent={ev.org === ORG_NAME && onEditEvent ? onEditEvent : onOpenEvent}
              status={statusFor(ev)}/>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button onClick={onCreateEvent} style={{
        position: 'absolute', bottom: 24, right: 18,
        appearance: 'none', cursor: 'pointer',
        background: 'var(--accent)', color: 'var(--accent-ink)',
        border: 'none', borderRadius: 999,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
        boxShadow: '0 8px 24px oklch(0.88 0.18 100 / 0.35), 0 2px 4px oklch(0 0 0 / 0.3)',
        zIndex: 4,
      }}>
        {Icon.plus(16)} Post event
      </button>
    </div>
  );
}

function KPICard({ label, value, delta, up }) {
  return (
    <div style={{
      padding: 14, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
    }}>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
        color: 'var(--fg-dim)',
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
        letterSpacing: '-0.02em', marginTop: 4,
      }}>{value}</div>
      <div className="mono" style={{
        fontSize: 10, marginTop: 2,
        color: up ? 'var(--accent)' : 'var(--fg-muted)',
      }}>{delta}</div>
    </div>
  );
}

function OrgEventRow({ event, onOpenEvent, status }) {
  const statusColor =
    status === 'LIVE' ? 'var(--hot)' :
    status === 'SCHEDULED' ? 'var(--accent)' :
    status === 'PENDING' ? 'var(--accent)' :
    'var(--fg-dim)';
  return (
    <div onClick={() => onOpenEvent(event.id)} style={{
      padding: 12, cursor: 'pointer',
      background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
      borderRadius: 'var(--r-md)',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div className="poster-ph" style={{
        flex: '0 0 48px', height: 48, borderRadius: 6,
        background: `linear-gradient(135deg, oklch(0.32 0.04 ${event.color}) 0%, oklch(0.20 0.02 240) 100%)`,
      }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span className="mono" style={{
            fontSize: 9, letterSpacing: 0.1, color: statusColor, fontWeight: 700,
          }}>{status === 'LIVE' && '● '}{status}</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{event.title}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 3 }}>
          {event.going || 0} going
        </div>
      </div>
      <span style={{ color: 'var(--fg-muted)' }}>{Icon.arrowR(14)}</span>
    </div>
  );
}

// ───────────── CREATE / EDIT EVENT ─────────────
// Look up the user's home city in NA_CITIES so the published event's coords
// match where they actually are, not the prototype's Blue Mountain hardcode.
function coordsForCity(city) {
  if (!city) return null;
  const target = String(city).toLowerCase();
  for (const c of (window.JR_DATA?.NA_CITIES || [])) {
    if (c.name.toLowerCase() === target) {
      const lat = c.lat, lon = c.lon;
      const ns = lat >= 0 ? 'N' : 'S';
      const ew = lon >= 0 ? 'E' : 'W';
      return { lat, lon, label: `${Math.abs(lat).toFixed(4)}° ${ns} · ${Math.abs(lon).toFixed(4)}° ${ew}` };
    }
  }
  return null;
}

function CreateEventScreen({ prefs, onBack, onPublish, editing, findDuplicates }) {
  const isEdit = !!editing;
  const [type, setType]       = React.useState(editing?.type    || 'Rail jam');
  const [title, setTitle]     = React.useState(editing?.title   || '');
  const [skill, setSkill]     = React.useState(editing?.skill   || 'All');
  const [cost, setCost]       = React.useState(editing?.cost    || 'Free');
  const [currency, setCurrency] = React.useState(editing?.currency || 'USD');
  const [regLink, setRegLink] = React.useState(editing?.regLink || '');
  const [desc, setDesc]       = React.useState(editing?.desc    || '');
  const [poster, setPoster]   = React.useState(editing?.poster  || null); // data URL
  const [location, setLocation] = React.useState(editing?.location || '');

  // ISO date + time inputs play nicely with the iOS native pickers.
  // Best-effort seed when editing: yank the day/month from event.when and combine.
  const [date, setDate] = React.useState(() => {
    const seedISO = parseWhenToISO(editing?.when);
    return seedISO?.date || '';
  });
  const [time, setTime] = React.useState(() => {
    const seedISO = parseWhenToISO(editing?.when);
    return seedISO?.time || '';
  });

  const [posterUploading, setPosterUploading] = React.useState(false);
  const canPublish = title.trim().length > 0 && !!date && !posterUploading;

  // Poster upload: try Supabase Storage when configured (smaller events row,
  // images served via CDN). Falls back to a base64 data-URL when Storage isn't
  // available — keeps the prototype usable without auth setup.
  const onPickPoster = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sb = window.JR_SUPABASE;
    const user = sb && (await sb.auth.getUser()).data?.user;
    if (sb && user) {
      try {
        setPosterUploading(true);
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await sb.storage.from('posters').upload(path, file, {
          cacheControl: '31536000', upsert: false, contentType: file.type || 'image/jpeg',
        });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = sb.storage.from('posters').getPublicUrl(path);
        setPoster(publicUrl);
        setPosterUploading(false);
        return;
      } catch (err) {
        console.warn('[CreateEvent] poster upload failed, falling back to base64:', err.message);
        setPosterUploading(false);
      }
    }
    // Fallback: base64 data-URL (works without auth/storage).
    const reader = new FileReader();
    reader.onload = () => setPoster(reader.result);
    reader.readAsDataURL(file);
  };

  const [dupes, setDupes] = React.useState(null);

  const buildEvent = () => {
    const id = editing?.id || ('u' + Date.now().toString(36));
    const sportFor = (t) =>
      /skate/i.test(t) ? 'skate' :
      /indoor/i.test(t) ? 'indoor' :
      /ski/i.test(t) ? 'ski' : 'snowboard';
    // Geocode the user's home city via NA_CITIES; falls back to nothing
    // (rather than a hardcoded Blue Mountain pin) when we don't recognize
    // the city — the map will simply not show a pin for that event until
    // location is filled in.
    const cityCoords = coordsForCity(prefs?.city);
    return {
      id, title: title.trim(),
      // The user's organizer name from onboarding wins; prototype constant only
      // when the user hasn't filled in an organizer name.
      org: editing?.org
        || prefs?.organizerName?.trim()
        || window.JR_CONFIG?.PROTOTYPE_ORG_NAME
        || 'Blue Mountain Park Crew',
      // org_verified must be set by an admin via the verification flow, not
      // self-asserted by the publisher. RLS now enforces this on the server.
      orgVerified: editing?.orgVerified ?? false,
      sport: sportFor(type), type,
      skill, cost,
      currency,
      prize: editing?.prize || null,
      when: formatWhen(date, time) || editing?.when || '',
      deadline: editing?.deadline || null,
      // Distance is computed from the user's location to the event venue,
      // not picked here — leave null so Discover/Map can compute it once we
      // know where the rider is opening from.
      distanceKm: editing?.distanceKm ?? null,
      indoor: /indoor/i.test(type),
      saved: false, going: editing?.going || 0, live: editing?.live || false,
      coords: editing?.coords || cityCoords?.label || null,
      lat:    editing?.lat    ?? cityCoords?.lat   ?? null,
      lon:    editing?.lon    ?? cityCoords?.lon   ?? null,
      location: location.trim() || editing?.location || 'Location TBD',
      desc: desc || 'Event details coming soon.',
      sponsors: editing?.sponsors || [],
      color: editing?.color || 95,
      regLink: regLink || null,
      poster: poster || null,
      // Edits to already-approved events stay approved; new ones go pending.
      status: isEdit ? (editing.status || 'approved') : 'pending',
    };
  };

  const publish = () => {
    if (!canPublish) return;
    const candidate = buildEvent();
    // Skip dedupe for edits — we're updating in-place.
    if (!isEdit && findDuplicates) {
      const matches = findDuplicates(candidate).filter(m => m.score >= 0.65);
      if (matches.length > 0) {
        setDupes({ candidate, matches });
        return;
      }
    }
    onPublish?.(candidate);
  };

  const confirmAsNew = () => {
    onPublish?.(dupes.candidate);
    setDupes(null);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line-soft)' }}>
        <BackButton onClick={onBack}/>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', flex: 1 }}>
          {isEdit ? 'Edit event' : 'New event'}
        </div>
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 100px' }}>
        {/* Poster builder — accepts image upload via FileReader → data URL */}
        <label className="poster-ph" style={{
          display: 'flex', height: 180, borderRadius: 'var(--r-md)',
          marginBottom: 18, position: 'relative', cursor: 'pointer',
          background: poster
            ? `center/cover no-repeat url(${poster})`
            : 'linear-gradient(135deg, oklch(0.32 0.04 95) 0%, oklch(0.20 0.02 240) 100%)',
          alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8, overflow: 'hidden',
        }}>
          <input type="file" accept="image/*" onChange={onPickPoster}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}/>
          {poster ? (
            <span className="mono" style={{
              position: 'absolute', bottom: 10, right: 10,
              padding: '4px 8px', borderRadius: 4,
              background: 'oklch(0 0 0 / 0.6)', color: 'white',
              fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase',
            }}>Replace</span>
          ) : (
            <>
              <span style={{ color: 'oklch(1 0 0 / 0.7)' }}>{Icon.plus(28)}</span>
              <span className="mono" style={{ fontSize: 11, color: 'oklch(1 0 0 / 0.7)', letterSpacing: 0.1, textTransform: 'uppercase' }}>
                Add event poster
              </span>
            </>
          )}
        </label>

        <FormField label="Event type">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EVENT_TYPES.slice(0, 6).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                appearance: 'none', cursor: 'pointer',
                padding: '8px 12px', borderRadius: 999, fontSize: 12,
                background: type === t ? 'var(--accent)' : 'transparent',
                border: `1px solid ${type === t ? 'var(--accent)' : 'var(--line)'}`,
                color: type === t ? 'var(--accent-ink)' : 'var(--fg)',
              }}>{t}</button>
            ))}
          </div>
        </FormField>

        <FormField label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midnight Rail Riot"
            style={{
              width: '100%', background: 'var(--bg-surface)',
              border: '1px solid var(--line-soft)', borderRadius: 10,
              padding: '12px 14px', color: 'var(--fg)', fontSize: 15,
              fontFamily: 'var(--font-display)', fontWeight: 500,
            }}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={fieldStyle}
            />
          </FormField>
          <FormField label="Time">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={fieldStyle}
            />
          </FormField>
        </div>

        <FormField label="Location">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Venue or address"
            style={fieldStyle}
          />
        </FormField>

        <FormField label="Cost">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Free or amount"
              style={{ ...fieldStyle, flex: 1 }}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ ...fieldStyle, flex: 1 }}>
              <option>USD</option>
              <option>CAD</option>
            </select>
          </div>
        </FormField>

        <FormField label="Registration link">
          <input
            value={regLink}
            onChange={(e) => setRegLink(e.target.value)}
            placeholder="https://…"
            style={fieldStyle}
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Course details, format, prizes, sponsor info…"
            rows={4}
            style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </FormField>

        <FormField label="Skill level">
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Beginner', 'Intermediate', 'Open'].map(s => {
              const on = skill === s;
              return (
                <button key={s} onClick={() => setSkill(s)} style={{
                  flex: 1, appearance: 'none', cursor: 'pointer',
                  padding: '8px 0', borderRadius: 8, fontSize: 12,
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                  color: on ? 'var(--accent)' : 'var(--fg-muted)',
                }}>{s}</button>
              );
            })}
          </div>
        </FormField>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'oklch(0.18 0.018 240 / 0.92)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--line-soft)',
        padding: '12px 16px 28px',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)' }}>
          {canPublish ? 'Submitted events go through admin approval (~2h).' : 'Add a title to publish.'}
        </span>
        <span style={{ flex: 1 }}/>
        <button
          className="btn-accent"
          onClick={publish}
          disabled={!canPublish}
          style={{ opacity: canPublish ? 1 : 0.4, cursor: canPublish ? 'pointer' : 'not-allowed' }}
        >{isEdit ? 'Save changes' : 'Publish'}</button>
      </div>

      {dupes && (
        <DuplicateModal
          matches={dupes.matches}
          onSame={() => {
            // Treat as duplicate — don't insert. Surface a toast so it's clear.
            window.dispatchEvent(new CustomEvent('jr:toast', {
              detail: { msg: 'Event already exists — not duplicated' },
            }));
            setDupes(null);
            onBack?.();
          }}
          onDifferent={confirmAsNew}
          onCancel={() => setDupes(null)}
        />
      )}
    </div>
  );
}

// Pre-insert dedupe modal. Shown when CreateEventScreen detects existing events
// that look like the same thing the user is about to publish.
function DuplicateModal({ matches, onSame, onDifferent, onCancel }) {
  return (
    <div onClick={onCancel} style={{
      position: 'absolute', inset: 0, zIndex: 30,
      background: 'oklch(0 0 0 / 0.6)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'jr-fade-in .2s ease forwards',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-base)',
        borderTop: '1px solid var(--accent)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '14px 18px 22px',
        maxHeight: '78%',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 40px oklch(0 0 0 / 0.5)',
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--line)', margin: '0 auto 12px',
        }}/>
        <div className="mono" style={{
          fontSize: 11, letterSpacing: 0.14, textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 8,
        }}>Possible duplicate</div>
        <h2 style={{
          margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
          letterSpacing: '-0.02em', marginBottom: 12,
        }}>Looks like this might already be on JamRadar</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          We found {matches.length} event{matches.length === 1 ? '' : 's'} that could be the same.
          Take a look — is one of them yours?
        </p>

        <div className="jr-scroll" style={{
          overflowY: 'auto', flex: 1,
          display: 'flex', flexDirection: 'column', gap: 8,
          marginBottom: 16,
        }}>
          {matches.map(({ event, score }) => (
            <div key={event.id} style={{
              padding: 12, borderRadius: 10,
              background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div className="poster-ph" style={{
                flex: '0 0 44px', height: 44, borderRadius: 6,
                background: `linear-gradient(135deg, oklch(0.32 0.04 ${event.color || 95}) 0%, oklch(0.20 0.02 240) 100%)`,
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 13, lineHeight: 1.25,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{event.title}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>
                  {event.when} · {event.location}
                </div>
                <div className="mono" style={{
                  fontSize: 9, color: 'var(--accent)', marginTop: 2,
                  letterSpacing: 0.08,
                }}>{Math.round(score * 100)}% match</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSame} className="btn-accent" style={{ flex: 1 }}>
            Yes — same event
          </button>
          <button onClick={onDifferent} className="btn-ghost" style={{ flex: 1 }}>
            No — different
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: '100%', background: 'var(--bg-surface)',
  border: '1px solid var(--line-soft)', borderRadius: 10,
  padding: '12px 14px', color: 'var(--fg)', fontSize: 14,
};

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
        color: 'var(--fg-dim)', marginBottom: 6,
      }}>{label}</div>
      {children}
    </div>
  );
}

// "Sat · Nov 14 · 7:00 PM" → { date: '2026-11-14', time: '19:00' }
// Loose parse — returns null on anything we can't read.
function parseWhenToISO(when) {
  if (!when) return null;
  const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const parts = when.split('·').map(s => s.trim());
  if (parts.length < 2) return null;
  const [, monthDay, time] = parts;
  const md = monthDay.split(' ');
  const month = MONTHS[md[0]];
  const day = parseInt(md[1], 10);
  if (month == null || !Number.isFinite(day)) return null;
  const yearGuess = (new Date()).getFullYear();
  const isoDate = `${yearGuess}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  let isoTime = '';
  if (time) {
    const m = time.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)?/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      if (/pm/i.test(m[3]) && h < 12) h += 12;
      if (/am/i.test(m[3]) && h === 12) h = 0;
      isoTime = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }
  return { date: isoDate, time: isoTime };
}

// { date: '2026-11-14', time: '19:00' } → "Sat · Nov 14 · 7:00 PM"
// Matches the prototype's existing `when` format so map/calendar parsing stays happy.
function formatWhen(date, time) {
  if (!date) return '';
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = date.split('-').map(n => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dayLabel = DAYS[dt.getUTCDay()];
  const monthLabel = MONTHS[m - 1];
  const dayNum = d;
  let timeLabel = '';
  if (time) {
    const [hh, mm] = time.split(':').map(n => parseInt(n, 10));
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = ((hh + 11) % 12) + 1;
    timeLabel = ` · ${h12}:${String(mm).padStart(2, '0')} ${period}`;
  }
  return `${dayLabel} · ${monthLabel} ${dayNum}${timeLabel}`;
}

Object.assign(window, {
  EventDetail, ProfileScreen, NotificationsScreen,
  OrgDashboard, CreateEventScreen,
});
