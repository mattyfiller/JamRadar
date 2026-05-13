// JamRadar — Admin dashboard
// Spec: 13_admin_and_moderation.md
// Tabs: Pending events · Verified orgs · Featured

function AdminDashboard({ events, onApprove, onReject, onFeature, onVerifyOrg, onOpenEvent, onBack, fetchPendingMerges, resolvePendingMerge }) {
  const [tab, setTab] = React.useState('pending');
  const [merges, setMerges] = React.useState([]);
  const [mergesLoading, setMergesLoading] = React.useState(false);

  const pending  = events.filter(e => e.status === 'pending');
  const approved = events.filter(e => e.status !== 'pending');
  const featured = events.filter(e => e.featured);

  // Refresh the merges queue when the user opens that tab.
  React.useEffect(() => {
    if (tab !== 'merges' || !fetchPendingMerges) return;
    let cancelled = false;
    setMergesLoading(true);
    fetchPendingMerges().then(rows => {
      if (cancelled) return;
      setMerges(rows);
      setMergesLoading(false);
    });
    return () => { cancelled = true; };
  }, [tab]);

  const handleResolve = async (id, action) => {
    if (!resolvePendingMerge) return;
    try {
      await resolvePendingMerge(id, action);
      setMerges(prev => prev.filter(m => m.id !== id));
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: action === 'merged'   ? 'Merged into existing event'
                     : action === 'split'    ? 'Inserted as a new event'
                     : 'Discarded' },
      }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Resolve failed: ' + e.message },
      }));
    }
  };

  // De-dup orgs from events for the "Verify orgs" tab. An org is considered
  // verified if ANY of its events is verified — verifyOrg() flips all events
  // for that org in one action, so partial states should be rare, but if a
  // single event slipped through (RLS hiccup, retry needed) we still surface
  // the org as verified so the admin doesn't spam the button.
  const orgs = [];
  events.forEach(e => {
    if (!e.org) return;
    let row = orgs.find(o => o.name === e.org);
    if (!row) {
      row = {
        name: e.org,
        verified: false,
        eventCount: 0,
        // Pick the most common "type" descriptor across the org's events.
        // Indoor facilities should never accidentally show "Mountain".
        type: e.indoor || e.sport === 'indoor' ? 'Indoor facility' : 'Mountain',
      };
      orgs.push(row);
    }
    row.eventCount += 1;
    if (e.orgVerified) row.verified = true;
  });
  // Sort: unverified first (admin's queue), then by event count desc.
  orgs.sort((a, b) => (a.verified - b.verified) || (b.eventCount - a.eventCount));

  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <BackButton onClick={onBack}/>
          <div className="mono" style={{
            fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
            color: 'var(--fg-dim)',
          }}>Admin</div>
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
          letterSpacing: '-0.025em',
        }}>Moderation</div>
        <div className="mono" style={{
          fontSize: 10, color: 'var(--fg-dim)', marginTop: 4,
        }}>{pending.length} pending · {approved.length} live · {orgs.filter(o => !o.verified).length} unverified</div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '0 16px', marginBottom: 12,
        overflowX: 'auto',
      }} className="jr-scroll">
        {[
          ['pending',  `Pending (${pending.length})`],
          ['merges',   `Merges${merges.length ? ` (${merges.length})` : ''}`],
          ['orgs',     `Orgs (${orgs.filter(o => !o.verified).length})`],
          ['featured', `Featured (${featured.length})`],
        ].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            appearance: 'none', cursor: 'pointer', flex: 1,
            padding: '10px 8px', borderRadius: 10, fontSize: 12,
            background: tab === id ? 'var(--accent-soft)' : 'var(--bg-surface)',
            border: `1px solid ${tab === id ? 'var(--accent)' : 'var(--line-soft)'}`,
            color: tab === id ? 'var(--accent)' : 'var(--fg)',
            fontFamily: 'var(--font-display)', fontWeight: 600,
          }}>{lbl}</button>
        ))}
      </div>

      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 40px' }}>
        {tab === 'pending' && (
          pending.length === 0 ? (
            <Empty
              icon="✓" title="Inbox zero"
              sub="No events waiting for approval."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map(e => (
                <PendingRow key={e.id}
                  event={e}
                  onOpen={() => onOpenEvent(e.id)}
                  onApprove={() => onApprove(e.id)}
                  onReject={() => onReject(e.id)}
                />
              ))}
            </div>
          )
        )}

        {tab === 'merges' && (
          mergesLoading ? (
            <Empty icon="◌" title="Loading…" sub="Pulling pending merges from the queue."/>
          ) : merges.length === 0 ? (
            <Empty
              icon="✓" title="No pending merges"
              sub="Scrapers haven't found any medium-confidence dupes since you last cleared this."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', lineHeight: 1.5 }}>
                Each row pairs an incoming candidate with what we think it duplicates. Approve the right action.
              </div>
              {merges.map(m => (
                <MergeRow key={m.id}
                  merge={m}
                  onMerge={() => handleResolve(m.id, 'merged')}
                  onSplit={() => handleResolve(m.id, 'split')}
                  onDiscard={() => handleResolve(m.id, 'discarded')}/>
              ))}
            </div>
          )
        )}

        {tab === 'orgs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orgs.map(o => (
              <div key={o.name} style={{
                padding: 14, borderRadius: 'var(--r-md)',
                background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'var(--bg-surface-2)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                }}>{o.name.split(' ').map(s => s[0]).slice(0, 2).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontWeight: 600, fontSize: 14,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{o.name}</span>
                    {o.verified && <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>
                    {o.type} · {o.eventCount} event{o.eventCount === 1 ? '' : 's'}
                  </div>
                </div>
                {o.verified ? (
                  <span className="mono" style={{
                    fontSize: 10, color: 'var(--accent)',
                    letterSpacing: 0.08, textTransform: 'uppercase',
                  }}>Verified</span>
                ) : (
                  <button
                    className="btn-accent"
                    style={{ padding: '6px 12px', fontSize: 11 }}
                    onClick={async () => {
                      try {
                        const result = await onVerifyOrg?.(o.name);
                        window.dispatchEvent(new CustomEvent('jr:toast', {
                          detail: { msg: `Verified ${o.name} (${result?.count || 0} event${result?.count === 1 ? '' : 's'})` },
                        }));
                      } catch (err) {
                        window.dispatchEvent(new CustomEvent('jr:toast', {
                          detail: { msg: err?.message || `Couldn't verify ${o.name}` },
                        }));
                      }
                    }}>
                    Verify
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'featured' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginBottom: 4 }}>
              Tap an event to feature it on the rider feed.
            </div>
            {approved.map(e => (
              <FeatureRow key={e.id}
                event={e}
                onOpen={() => onOpenEvent(e.id)}
                onToggleFeature={() => onFeature(e.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRow({ event, onOpen, onApprove, onReject }) {
  return (
    <div style={{
      padding: 12, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)',
      border: '1px solid oklch(0.88 0.18 100 / 0.4)',
    }}>
      <div onClick={onOpen} style={{
        display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', marginBottom: 12,
      }}>
        <div className="poster-ph" style={{
          flex: '0 0 48px', height: 48, borderRadius: 6,
          background: `linear-gradient(135deg, oklch(0.32 0.04 ${event.color || 95}) 0%, oklch(0.20 0.02 240) 100%)`,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
          }}>
            <span className="mono" style={{
              fontSize: 9, letterSpacing: 0.1, color: 'var(--accent)', fontWeight: 700,
            }}>● PENDING</span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--fg-dim)' }}>· {event.type}</span>
          </div>
          <div style={{
            fontWeight: 600, fontSize: 14, lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{event.title}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 3 }}>
            {event.org} · {event.when}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onReject} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          Reject
        </button>
        <button onClick={onApprove} className="btn-accent" style={{ flex: 2, padding: '10px 0', fontSize: 13 }}>
          Approve
        </button>
      </div>
    </div>
  );
}

function FeatureRow({ event, onOpen, onToggleFeature }) {
  const isFeatured = !!event.featured;
  return (
    <div style={{
      padding: 12, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)',
      border: `1px solid ${isFeatured ? 'var(--accent)' : 'var(--line-soft)'}`,
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div onClick={onOpen} style={{
        flex: 1, minWidth: 0, cursor: 'pointer',
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div className="poster-ph" style={{
          flex: '0 0 40px', height: 40, borderRadius: 6,
          background: `linear-gradient(135deg, oklch(0.32 0.04 ${event.color || 95}) 0%, oklch(0.20 0.02 240) 100%)`,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 13, lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{event.title}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>
            {event.org}
          </div>
        </div>
      </div>
      <button onClick={onToggleFeature} style={{
        appearance: 'none', cursor: 'pointer',
        padding: '6px 12px', borderRadius: 999, fontSize: 11,
        background: isFeatured ? 'var(--accent)' : 'transparent',
        border: `1px solid ${isFeatured ? 'var(--accent)' : 'var(--line)'}`,
        color: isFeatured ? 'var(--accent-ink)' : 'var(--fg)',
        fontFamily: 'var(--font-display)', fontWeight: 600,
      }}>{isFeatured ? '★ Featured' : '☆ Feature'}</button>
    </div>
  );
}

// Side-by-side comparison of an incoming candidate vs the existing event the
// dedupe scorer thought might be the same. Three actions:
//   Merge  → patch missing fields on existing event, drop candidate
//   Split  → insert candidate as a new event (not a duplicate after all)
//   Discard → drop candidate entirely
function MergeRow({ merge, onMerge, onSplit, onDiscard }) {
  const cand = merge.candidate || {};
  const existing = merge.matchEvent;
  const pct = Math.round(merge.score * 100);
  return (
    <div style={{
      padding: 14, borderRadius: 'var(--r-md)',
      background: 'var(--bg-surface)', border: '1px solid var(--accent)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div className="mono" style={{
          fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
          color: 'var(--accent)',
        }}>● {pct}% match · from {merge.candidateSource}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <SideCard side="Incoming candidate" event={{
          title: cand.title, when: cand.when_text, location: cand.location, org: cand.org_name,
        }}/>
        <SideCard side="Existing event" event={{
          title: existing?.title, when: existing?.when, location: existing?.location, org: existing?.org,
        }}/>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onDiscard} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 12 }}>
          Discard
        </button>
        <button onClick={onSplit}   className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 12 }}>
          Different
        </button>
        <button onClick={onMerge}   className="btn-accent" style={{ flex: 2, padding: '10px 0', fontSize: 12 }}>
          Same → Merge
        </button>
      </div>
    </div>
  );
}

function SideCard({ side, event }) {
  return (
    <div style={{
      padding: 10, borderRadius: 8,
      background: 'var(--bg-surface-2)',
      border: '1px solid var(--line-soft)',
    }}>
      <div className="mono" style={{
        fontSize: 9, color: 'var(--fg-dim)',
        letterSpacing: 0.1, textTransform: 'uppercase', marginBottom: 6,
      }}>{side}</div>
      <div style={{
        fontWeight: 600, fontSize: 13, lineHeight: 1.25,
        marginBottom: 6,
      }}>{event.title || '—'}</div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
        {event.when || '—'}<br/>
        {event.location || '—'}<br/>
        {event.org || '—'}
      </div>
    </div>
  );
}

function Empty({ icon, title, sub }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center', color: 'var(--fg-muted)',
      border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8, color: 'var(--accent)' }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--fg-dim)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

window.AdminDashboard = AdminDashboard;
