// JamRadar — Onboarding flow
// Steps: welcome → sports → location/radius → event types → notifications → done
// Spec: 04_core_user_flows.md

const { SPORTS: _OB_SPORTS, EVENT_TYPES: _OB_TYPES } = window.JR_DATA;

const RADIUS_PRESETS = [25, 50, 100, 250];
const NOTIF_STYLES = [
  { id: 'instant', label: 'Instant alerts',       sub: 'Ping me the moment something matches' },
  { id: 'daily',   label: 'Daily digest',         sub: 'One quick summary each morning' },
  { id: 'weekly',  label: 'Weekly digest',        sub: 'Friday rundown of next 7 days' },
  { id: 'saved',   label: 'Only saved events',    sub: 'Reminders for bookmarked events only' },
  { id: 'reg',     label: 'Only deadlines',       sub: 'Just registration cutoff alerts' },
];

function Onboarding({ onDone, defaults = {} }) {
  const [step, setStep] = React.useState(0);
  const totalSteps = 7;

  const [accountType, setAccountType]     = React.useState(defaults.accountType ?? 'rider');
  const [organizerName, setOrganizerName] = React.useState(defaults.organizerName ?? '');
  const [organizerKind, setOrganizerKind] = React.useState(defaults.organizerKind ?? 'mountain');
  const [sports, setSports] = React.useState(defaults.sports ?? ['snowboard', 'ski']);
  const [city, setCity]     = React.useState(defaults.city ?? 'Toronto');
  const [radius, setRadius] = React.useState(defaults.radius ?? 50);
  const [types, setTypes]   = React.useState(defaults.types ?? ['Rail jam', 'Park event', 'Indoor session']);
  const [notif, setNotif]   = React.useState(defaults.notif ?? 'instant');

  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const finish = () => onDone?.({
    accountType,
    organizerName: accountType === 'organizer' ? organizerName.trim() : '',
    organizerKind: accountType === 'organizer' ? organizerKind : 'mountain',
    sports, city, radius, types, notif,
  });

  const toggleIn = (arr, id) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-base)', color: 'var(--fg)',
    }}>
      {/* Top progress bar */}
      <div style={{ padding: '8px 18px 0' }}>
        <div style={{
          display: 'flex', gap: 4, height: 3, marginBottom: 12,
        }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 2,
              background: i <= step ? 'var(--accent)' : 'var(--line-soft)',
              transition: 'background .25s ease',
            }}/>
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          minHeight: 32,
        }}>
          {step > 0 && step < totalSteps - 1 ? (
            <button onClick={back} style={{
              appearance: 'none', border: 'none', background: 'transparent',
              color: 'var(--fg-dim)', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
            }}>{Icon.back(18)} Back</button>
          ) : <span/>}
          <span className="mono" style={{
            fontSize: 10, color: 'var(--fg-dim)',
            letterSpacing: 0.12, textTransform: 'uppercase',
          }}>{step + 1} / {totalSteps}</span>
        </div>
      </div>

      {/* Step body */}
      <div className="jr-scroll screen-fade" key={step} style={{
        flex: 1, overflowY: 'auto', padding: '20px 22px 20px',
      }}>
        {step === 0 && <StepWelcome/>}
        {step === 1 && (
          <StepAccountType
            accountType={accountType} onAccountType={setAccountType}
            organizerName={organizerName} onOrganizerName={setOrganizerName}
            organizerKind={organizerKind} onOrganizerKind={setOrganizerKind}
          />
        )}
        {step === 2 && (
          <StepSports
            sports={sports}
            onToggle={(id) => setSports(s => toggleIn(s, id))}
          />
        )}
        {step === 3 && (
          <StepLocation
            city={city} onCity={setCity}
            radius={radius} onRadius={setRadius}
          />
        )}
        {step === 4 && (
          <StepTypes
            types={types}
            onToggle={(t) => setTypes(arr => toggleIn(arr, t))}
          />
        )}
        {step === 5 && (
          <StepNotif notif={notif} onNotif={setNotif}/>
        )}
        {step === 6 && (
          <StepDone
            accountType={accountType} organizerName={organizerName} organizerKind={organizerKind}
            sports={sports} city={city} radius={radius}
            types={types} notif={notif}
          />
        )}
      </div>

      {/* CTA bar */}
      <div style={{
        borderTop: '1px solid var(--line-soft)',
        padding: '14px 18px 30px',
        background: 'oklch(0.18 0.018 240 / 0.92)',
        backdropFilter: 'blur(14px)',
      }}>
        {(() => {
          if (step >= totalSteps - 1) {
            return (
              <button onClick={finish} className="btn-accent" style={{ width: '100%' }}>
                Open my radar
              </button>
            );
          }
          const blocked =
            (step === 1 && accountType === 'organizer' && organizerName.trim().length === 0) ||
            (step === 2 && sports.length === 0) ||
            (step === 4 && types.length === 0);
          return (
            <button
              onClick={next}
              disabled={blocked}
              className="btn-accent"
              style={{
                width: '100%',
                opacity: blocked ? 0.4 : 1,
                cursor: blocked ? 'not-allowed' : 'pointer',
              }}
            >
              {step === 0 ? 'Get on the radar' : 'Continue'}
            </button>
          );
        })()}
      </div>
    </div>
  );
}

// ───────────── STEP 1: Account type ─────────────
const ORGANIZER_KINDS = [
  { id: 'mountain',         label: 'Mountain / resort' },
  { id: 'indoor',           label: 'Indoor facility' },
  { id: 'shop',             label: 'Ski / snowboard / skate shop' },
  { id: 'brand',            label: 'Brand' },
  { id: 'club',             label: 'Club' },
  { id: 'skatepark',        label: 'Skatepark' },
  { id: 'event-organizer',  label: 'Event organizer' },
];

function StepAccountType({ accountType, onAccountType, organizerName, onOrganizerName, organizerKind, onOrganizerKind }) {
  return (
    <div>
      <StepHeader
        kicker="01 · Account"
        title="Are you here to ride or to run events?"
        sub="You can switch later if you wear both hats."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          { id: 'rider',     label: 'Rider',      sub: 'Browse, save, RSVP', glyph: '◣' },
          { id: 'organizer', label: 'Organizer',  sub: 'Post events, see analytics', glyph: '★' },
        ].map(opt => {
          const on = accountType === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAccountType(opt.id)}
              style={{
                appearance: 'none', cursor: 'pointer', textAlign: 'left',
                padding: 16, borderRadius: 'var(--r-md)',
                background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                color: 'var(--fg)',
                display: 'flex', flexDirection: 'column', gap: 8, minHeight: 110,
                transition: 'background .15s ease, border-color .15s ease',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 26, color: on ? 'var(--accent)' : 'var(--fg-muted)',
                  lineHeight: 1,
                }}>{opt.glyph}</span>
                {on && (
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent)', color: 'var(--accent-ink)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{Icon.check(14)}</span>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 600,
                fontSize: 16, letterSpacing: '-0.01em',
              }}>{opt.label}</span>
              <span className="mono" style={{
                fontSize: 10, color: 'var(--fg-dim)', letterSpacing: 0.06,
                textTransform: 'uppercase',
              }}>{opt.sub}</span>
            </button>
          );
        })}
      </div>

      {accountType === 'organizer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="mono" style={{
              fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
              color: 'var(--fg-dim)', marginBottom: 6,
            }}>Organization name</div>
            <input
              value={organizerName}
              onChange={(e) => onOrganizerName(e.target.value)}
              placeholder="e.g. Blue Mountain Park Crew"
              maxLength={64}
              style={{
                width: '100%', background: 'var(--bg-surface)',
                border: '1px solid var(--line-soft)', borderRadius: 10,
                padding: '12px 14px', color: 'var(--fg)', fontSize: 15,
                fontFamily: 'var(--font-display)', fontWeight: 500,
              }}
            />
          </div>

          <div>
            <div className="mono" style={{
              fontSize: 10, letterSpacing: 0.12, textTransform: 'uppercase',
              color: 'var(--fg-dim)', marginBottom: 6,
            }}>What kind of org?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ORGANIZER_KINDS.map(k => {
                const on = organizerKind === k.id;
                return (
                  <button
                    key={k.id}
                    onClick={() => onOrganizerKind(k.id)}
                    style={{
                      appearance: 'none', cursor: 'pointer',
                      padding: '8px 12px', borderRadius: 999, fontSize: 12,
                      background: on ? 'var(--accent)' : 'transparent',
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                      color: on ? 'var(--accent-ink)' : 'var(--fg)',
                      fontFamily: 'var(--font-display)', fontWeight: 500,
                    }}
                  >{k.label}</button>
                );
              })}
            </div>
          </div>

          <p className="mono" style={{
            margin: 0, fontSize: 10, color: 'var(--fg-dim)', lineHeight: 1.5,
          }}>
            New organizers go through admin verification before events go live to riders.
            You'll be able to post immediately; events show on Discover once approved.
          </p>
        </div>
      )}
    </div>
  );
}

// ───────────── STEP 0: Welcome ─────────────
function StepWelcome() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'flex-start',
      minHeight: '70%', gap: 18,
    }}>
      {/* Pulsing radar mark */}
      <div style={{
        width: 88, height: 88, position: 'relative', marginBottom: 8,
      }}>
        {[88, 64, 40].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2,
            border: '1px solid oklch(0.88 0.18 100 / 0.3)',
            borderRadius: '50%',
          }}/>
        ))}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 14, height: 14, marginLeft: -7, marginTop: -7,
          background: 'var(--accent)', borderRadius: '50%',
          boxShadow: '0 0 0 6px oklch(0.88 0.18 100 / 0.2), 0 0 22px var(--accent)',
        }}/>
      </div>

      <div className="mono" style={{
        fontSize: 11, letterSpacing: 0.14, textTransform: 'uppercase',
        color: 'var(--accent)',
      }}>JamRadar · v1</div>

      <h1 style={{
        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 38, lineHeight: 1.02, letterSpacing: '-0.03em',
      }}>
        Local action-sport radar.
      </h1>

      <p style={{
        margin: 0, fontSize: 15, lineHeight: 1.55,
        color: 'var(--fg-muted)', maxWidth: 320,
      }}>
        Rail jams, mountain events, indoor training, skate jams, gear deals.
        One feed, tuned to where you ride and what you ride.
      </p>

      <div style={{
        marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap',
      }}>
        {['Snowboard', 'Ski', 'Skate', 'Indoor'].map(t => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>
    </div>
  );
}

// ───────────── STEP 1: Sports ─────────────
function StepSports({ sports, onToggle }) {
  return (
    <div>
      <StepHeader
        kicker="02 · Sports"
        title="What do you ride?"
        sub="Pick one or many. You can change this later."
      />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        {_OB_SPORTS.map(s => {
          const on = sports.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s.id)}
              style={{
                appearance: 'none', cursor: 'pointer', textAlign: 'left',
                padding: 14, borderRadius: 'var(--r-md)',
                background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                color: 'var(--fg)',
                display: 'flex', flexDirection: 'column', gap: 8, minHeight: 92,
                transition: 'background .15s ease, border-color .15s ease',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 24, color: on ? 'var(--accent)' : 'var(--fg-muted)',
                  lineHeight: 1,
                }}>{s.icon}</span>
                {on && (
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent)', color: 'var(--accent-ink)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{Icon.check(14)}</span>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 600,
                fontSize: 15, letterSpacing: '-0.01em',
              }}>{s.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mono" style={{
        marginTop: 14, fontSize: 11, color: 'var(--fg-dim)',
        letterSpacing: 0.06, textAlign: 'center',
      }}>
        {sports.length} selected
      </div>
    </div>
  );
}

// ───────────── STEP 2: Location + radius ─────────────
function StepLocation({ city, onCity, radius, onRadius }) {
  const [custom, setCustom] = React.useState(!RADIUS_PRESETS.includes(radius));
  const [gpsState, setGpsState] = React.useState('idle'); // idle | locating | done | denied | unsupported

  // Source of truth for known cities is data.jsx → NA_CITIES.
  // The onboarding GPS button snaps the user's current location to whichever
  // known metro is closest.
  const KNOWN = (() => {
    const out = {};
    for (const c of (window.JR_DATA?.NA_CITIES || [])) {
      out[c.name] = [c.lat, c.lon];
    }
    if (!out.Toronto) out.Toronto = [43.6532, -79.3832];   // safety net
    return out;
  })();
  const haversineKm = (a, b) => {
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const x = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(x));
  };

  const useGPS = () => {
    if (!('geolocation' in navigator)) { setGpsState('unsupported'); return; }
    setGpsState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = [pos.coords.latitude, pos.coords.longitude];
        // Snap to the closest seeded city — keeps the prototype's geo features working.
        let best = 'Toronto', bestKm = Infinity;
        Object.entries(KNOWN).forEach(([name, c]) => {
          const km = haversineKm(here, c);
          if (km < bestKm) { bestKm = km; best = name; }
        });
        onCity(best);
        setGpsState('done');
      },
      () => setGpsState('denied'),
      { timeout: 6000 },
    );
  };

  const gpsLabel =
    gpsState === 'locating'    ? '…' :
    gpsState === 'done'        ? '✓ GPS' :
    gpsState === 'denied'      ? 'Denied' :
    gpsState === 'unsupported' ? 'N/A' :
    'Use GPS';

  return (
    <div>
      <StepHeader
        kicker="03 · Location"
        title="Where do you ride?"
        sub="We'll only ping you about events inside your radius."
      />

      {/* City field — bound to NA_CITIES via a datalist so users can't end
          up with an unrecognised free-text city that silently maps the map
          to Toronto. They can still type freely (postal codes etc.) but the
          autocomplete steers them toward known coordinates. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', borderRadius: 'var(--r-md)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--line-soft)', marginBottom: 4,
      }}>
        <span style={{ color: 'var(--accent)' }}>{Icon.pin(18)}</span>
        <input
          value={city}
          onChange={(e) => onCity(e.target.value)}
          placeholder="City"
          list="jr-city-suggestions"
          autoComplete="off"
          style={{
            flex: 1, background: 'transparent', border: 'none',
            color: 'var(--fg)', fontSize: 15, padding: 0,
            fontFamily: 'var(--font-display)',
          }}
        />
        <datalist id="jr-city-suggestions">
          {(window.JR_DATA?.NA_CITIES || []).map(c => (
            <option key={c.name} value={c.name}/>
          ))}
        </datalist>
        <button
          onClick={useGPS}
          disabled={gpsState === 'locating'}
          className="mono"
          style={{
            appearance: 'none', border: 'none', background: 'transparent',
            color: 'var(--accent)', cursor: gpsState === 'locating' ? 'wait' : 'pointer',
            fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase',
            opacity: gpsState === 'denied' || gpsState === 'unsupported' ? 0.5 : 1,
          }}
        >{gpsLabel}</button>
      </div>

      {/* Soft hint when the typed city isn't in NA_CITIES — map will still
          render but the auto-distance + GPS-snap features depend on a known
          metro. Friendly, not blocking. */}
      {city && !(window.JR_DATA?.NA_CITIES || []).some(c => c.name.toLowerCase() === city.toLowerCase()) && (
        <div className="mono" style={{
          fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 0.06,
          marginBottom: 14, paddingLeft: 14,
        }}>
          Heads up — we don't have coordinates for "{city}". Pick a city from the suggestions for a better map experience.
        </div>
      )}
      {(!city || (window.JR_DATA?.NA_CITIES || []).some(c => c.name.toLowerCase() === city.toLowerCase())) && (
        <div style={{ marginBottom: 18 }}/>
      )}

      {/* Radius selector */}
      <div className="mono" style={{
        fontSize: 10, color: 'var(--fg-dim)', letterSpacing: 0.12,
        textTransform: 'uppercase', marginBottom: 8,
      }}>Radius</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {RADIUS_PRESETS.map(r => {
          const on = !custom && radius === r;
          return (
            <button
              key={r}
              onClick={() => { setCustom(false); onRadius(r); }}
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '14px 12px', borderRadius: 10,
                background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                color: on ? 'var(--accent)' : 'var(--fg)',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16,
                letterSpacing: '-0.01em',
              }}
            >
              {r} <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>km</span>
            </button>
          );
        })}
      </div>

      {/* Custom radius */}
      <button
        onClick={() => setCustom(true)}
        style={{
          appearance: 'none', cursor: 'pointer', width: '100%',
          padding: 14, borderRadius: 'var(--r-md)',
          background: custom ? 'var(--bg-surface)' : 'transparent',
          border: `1px dashed ${custom ? 'var(--accent)' : 'var(--line)'}`,
          color: custom ? 'var(--accent)' : 'var(--fg-dim)',
          textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span className="mono" style={{
          fontSize: 11, letterSpacing: 0.1, textTransform: 'uppercase',
        }}>Custom radius</span>
        {custom && (
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16,
          }}>{radius} km</span>
        )}
      </button>

      {custom && (
        <div style={{ marginTop: 14 }}>
          <input
            type="range"
            min={5} max={500} step={5}
            value={radius}
            onChange={(e) => onRadius(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'oklch(0.88 0.18 100)' }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 4,
          }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)' }}>5 km</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)' }}>500 km</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────── STEP 3: Event types ─────────────
function StepTypes({ types, onToggle }) {
  return (
    <div>
      <StepHeader
        kicker="04 · Event types"
        title="What should we ping you about?"
        sub="Only these types will trigger notifications."
      />
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
      }}>
        {_OB_TYPES.map(t => {
          const on = types.includes(t);
          return (
            <button
              key={t}
              onClick={() => onToggle(t)}
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '10px 14px', borderRadius: 999, fontSize: 13,
                background: on ? 'var(--accent)' : 'transparent',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                color: on ? 'var(--accent-ink)' : 'var(--fg)',
                fontFamily: 'var(--font-display)', fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {on && Icon.check(12)}
              {t}
            </button>
          );
        })}
      </div>
      <div className="mono" style={{
        marginTop: 16, fontSize: 11, color: 'var(--fg-dim)',
        letterSpacing: 0.06, textAlign: 'center',
      }}>
        {types.length} selected
      </div>
    </div>
  );
}

// ───────────── STEP 4: Notification style ─────────────
function StepNotif({ notif, onNotif }) {
  return (
    <div>
      <StepHeader
        kicker="05 · Notifications"
        title="How should we ping you?"
        sub="One channel. Change anytime in You → Notifications."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {NOTIF_STYLES.map(n => {
          const on = notif === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onNotif(n.id)}
              style={{
                appearance: 'none', cursor: 'pointer', textAlign: 'left',
                padding: 14, borderRadius: 'var(--r-md)',
                background: on ? 'var(--accent-soft)' : 'var(--bg-surface)',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line-soft)'}`,
                color: 'var(--fg)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                background: on ? 'var(--accent)' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-ink)', flexShrink: 0,
              }}>
                {on && Icon.check(12)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: 14,
                }}>{n.label}</div>
                <div className="mono" style={{
                  fontSize: 10, color: 'var(--fg-dim)', marginTop: 3,
                }}>{n.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── STEP 5: Done summary ─────────────
function StepDone({ accountType, organizerName, organizerKind, sports, city, radius, types, notif }) {
  const sportLabels = sports
    .map(id => _OB_SPORTS.find(s => s.id === id)?.label)
    .filter(Boolean);
  const notifLabel = NOTIF_STYLES.find(n => n.id === notif)?.label;
  const orgKindLabel = ORGANIZER_KINDS.find(k => k.id === organizerKind)?.label;

  // Real count from the live event store. Falls back to seed events count if
  // Supabase hasn't loaded yet, so the welcome screen never lies.
  const matchingCount = React.useMemo(() => {
    const all = (window.JR_DATA?.events) || [];
    const wanted = new Set(sports || []);
    return all.filter(e => {
      if (e.status && e.status !== 'approved') return false;
      if (wanted.size && !wanted.has(e.sport)) return false;
      if (e.distanceKm != null && e.distanceKm > radius) return false;
      return true;
    }).length;
  }, [sports, radius]);

  return (
    <div>
      <StepHeader
        kicker="06 · Ready"
        title={accountType === 'organizer' ? "Welcome, organizer." : "You're on the radar."}
        sub="Quick recap — tap any pref later from your profile."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SummaryRow label="Account"
          value={accountType === 'organizer' ? `Organizer · ${orgKindLabel || ''}` : 'Rider'}/>
        {accountType === 'organizer' && organizerName && (
          <SummaryRow label="Org name" value={organizerName}/>
        )}
        <SummaryRow label="Sports"        value={sportLabels.join(', ') || '—'}/>
        <SummaryRow label="City"          value={city || '—'}/>
        <SummaryRow label="Radius"        value={`${radius} km`}/>
        <SummaryRow label="Event types"   value={`${types.length} selected`}/>
        <SummaryRow label="Notifications" value={notifLabel || '—'}/>
      </div>

      <div style={{
        marginTop: 22, padding: 14,
        background: 'var(--bg-surface)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--r-md)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ color: 'var(--accent)' }}>{Icon.spark(20)}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            {matchingCount === 0
              ? "We'll alert you when events drop in your area"
              : `${matchingCount} event${matchingCount === 1 ? '' : 's'} match${matchingCount === 1 ? 'es' : ''} your radar already`}
          </div>
          <div className="mono" style={{
            fontSize: 10, color: 'var(--fg-dim)', marginTop: 2,
          }}>Within {radius} km · this month</div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--bg-surface)', border: '1px solid var(--line-soft)',
    }}>
      <span className="mono" style={{
        fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase',
        color: 'var(--fg-dim)', minWidth: 100,
      }}>{label}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ───────────── shared step header ─────────────
function StepHeader({ kicker, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="mono" style={{
        fontSize: 10, letterSpacing: 0.14, textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 8,
      }}>{kicker}</div>
      <h2 style={{
        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 24, letterSpacing: '-0.025em', lineHeight: 1.1,
      }}>{title}</h2>
      {sub && (
        <p style={{
          margin: '8px 0 0', fontSize: 13, color: 'var(--fg-muted)',
          lineHeight: 1.5,
        }}>{sub}</p>
      )}
    </div>
  );
}

window.Onboarding = Onboarding;
