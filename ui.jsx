// JamRadar — shared UI primitives

const Icon = {
  radar: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2.4"/>
      <path d="M12 12 L19 6"/>
    </svg>
  ),
  pin: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/>
      <circle cx="12" cy="9" r="2.6"/>
    </svg>
  ),
  cal: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5"/>
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>
    </svg>
  ),
  tag: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 12.5 12.5 20.5a2 2 0 0 1-2.83 0L3 13.83V4h9.83l7.67 7.67a2 2 0 0 1 0 2.83z"/>
      <circle cx="8" cy="8" r="1.4"/>
    </svg>
  ),
  user: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6"/>
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>
    </svg>
  ),
  users: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2"/>
      <path d="M2 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5"/>
      <circle cx="17" cy="6.5" r="2.6"/>
      <path d="M16 13c2.4 0.2 4.4 1.6 5.5 4"/>
    </svg>
  ),
  bookmark: (s = 18, filled = false) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v17l-6-4-6 4z"/>
    </svg>
  ),
  bell: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 16h12l-1.4-2V11a4.6 4.6 0 0 0-9.2 0v3z"/>
      <path d="M10 19a2 2 0 0 0 4 0"/>
    </svg>
  ),
  search: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5"/>
      <path d="m20 20-3.5-3.5"/>
    </svg>
  ),
  filter: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M7 12h10M10 18h4"/>
    </svg>
  ),
  arrowR: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  ),
  arrowL: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 18l-6-6 6-6"/>
    </svg>
  ),
  check: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-11"/>
    </svg>
  ),
  share: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>
    </svg>
  ),
  plus: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  ext: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>
    </svg>
  ),
  spark: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/>
    </svg>
  ),
  back: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6"/>
    </svg>
  ),
};

// Unified back button. Hardened for iOS Safari PWA quirks across multiple
// rounds of "back doesn't work" reports:
//
//   - 44×44 hit target (Apple HIG minimum). Children pointer-events:none so
//     the SVG chevron NEVER absorbs the tap intended for the button.
//   - Both onClick AND onTouchEnd handlers — some iOS builds drop click
//     events on absolute-positioned buttons inside transformed parents.
//     Touchend fires reliably; we deduplicate via a ref so the same tap
//     doesn't navigate twice.
//   - touchAction:'manipulation' eliminates the 300ms double-tap delay.
//   - WebkitTapHighlightColor:'transparent' replaced with our own
//     scale-down press state so the user sees the tap registered.
//   - Pill variant uses a solid dark fill (no backdrop-filter) — iOS
//     PWA backdrop-filter has historic bugs around pointer events.
function BackButton({ onClick, variant = 'default', size = 22, label = 'Back' }) {
  const lastFireRef = React.useRef(0);
  const [pressed, setPressed] = React.useState(false);

  const fire = (e) => {
    // Dedup touchend + click double-fire within 300ms of each other.
    const now = Date.now();
    if (now - lastFireRef.current < 300) return;
    lastFireRef.current = now;
    onClick?.(e);
  };

  const base = {
    appearance: 'none', border: 'none', cursor: 'pointer',
    width: 44, height: 44, minWidth: 44, minHeight: 44,
    borderRadius: 999,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 0,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    flexShrink: 0,
    position: 'relative',
    zIndex: 2,
    transition: 'transform .1s ease, background .1s ease',
    transform: pressed ? 'scale(0.92)' : 'scale(1)',
  };
  const variants = {
    default: {
      background: pressed ? 'var(--bg-surface)' : 'transparent',
      color: 'var(--fg)',
    },
    pill: {
      // Solid dark, no backdrop-filter (iOS Safari quirk avoided).
      background: pressed ? 'oklch(0 0 0 / 0.75)' : 'oklch(0 0 0 / 0.55)',
      color: 'white',
    },
  };
  return (
    <button
      type="button"
      onClick={fire}
      onTouchEnd={(e) => { e.preventDefault(); fire(e); }}
      onTouchStart={() => setPressed(true)}
      onTouchCancel={() => setPressed(false)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      aria-label={label}
      style={{ ...base, ...(variants[variant] || variants.default) }}
    >
      <span style={{ pointerEvents: 'none', display: 'flex' }}>
        {Icon.back(size)}
      </span>
    </button>
  );
}
window.BackButton = BackButton;

// Sport icon labels with subtle color tint
function SportTag({ sport, size = 'sm' }) {
  const meta = window.JR_DATA.SPORTS.find(s => s.id === sport) || { label: sport, icon: '·' };
  const colorVar = `var(--sport-${sport})`;
  const fs = size === 'lg' ? 12 : 10;
  return (
    <span className="sport-tag" style={{ color: colorVar, fontSize: fs }}>
      <span style={{ fontSize: fs + 2, lineHeight: 1 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

// Distance + when row
function MetaRow({ event, compact = false }) {
  return (
    <div className="mono" style={{
      display: 'flex', gap: 12, alignItems: 'center',
      fontSize: 11, color: 'var(--fg-muted)',
      letterSpacing: 0.02,
    }}>
      <span>{event.distanceKm != null ? `${event.distanceKm} km` : 'Online'}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>{event.when}</span>
      {!compact && event.cost && (
        <>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: event.cost === 'Free' ? 'var(--accent)' : 'var(--fg-muted)' }}>
            {event.cost}
          </span>
        </>
      )}
    </div>
  );
}

// Poster-style event card (used in feed)
function EventCard({ event, onOpen, onSave, variant = 'default' }) {
  const isHero = variant === 'hero';
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(); }}
      style={{
        border: '1px solid var(--line-soft)',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--r-md)',
        padding: 0,
        textAlign: 'left',
        color: 'var(--fg)',
        width: '100%',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'block',
        transition: 'transform .2s ease, border-color .2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-soft)'; }}
    >
      {/* Poster — prefer uploaded image when available */}
      <div className="poster-ph" style={{
        height: isHero ? 180 : 140,
        position: 'relative',
        background: event.poster
          ? `center/cover no-repeat url(${event.poster})`
          : `linear-gradient(135deg, oklch(0.32 0.04 ${event.color}) 0%, oklch(0.20 0.02 240) 100%)`,
      }}>
        {/* contour lines — pointer-events:none so the SVG never absorbs taps
            intended for the card's onClick or the save button on top. */}
        <svg width="100%" height="100%" style={{
          position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none',
        }}>
          <g fill="none" stroke="white" strokeWidth="1">
            <path d="M-20 30 Q 80 10 180 40 T 380 30"/>
            <path d="M-20 60 Q 80 40 180 70 T 380 60"/>
            <path d="M-20 90 Q 80 70 180 100 T 380 90"/>
            <path d="M-20 120 Q 80 100 180 130 T 380 120"/>
            <path d="M-20 150 Q 80 130 180 160 T 380 150"/>
          </g>
        </svg>

        {/* top row: bib + save */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="bib">{event.type}</span>
            {event.featured && <FeaturedBadge/>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {event.live && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 4,
                background: 'var(--hot-soft)', color: 'var(--hot)',
                fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 700,
              }}>
                <span className="pulse-dot" />
                Live
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onSave?.(event.id); }}
              style={{
                appearance: 'none', border: 'none',
                width: 32, height: 32, borderRadius: 999,
                background: 'oklch(0 0 0 / 0.4)',
                backdropFilter: 'blur(6px)',
                color: event.saved ? 'var(--accent)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Save event"
            >
              {Icon.bookmark(15, event.saved)}
            </button>
          </div>
        </div>

        {/* bottom: title */}
        <div style={{
          position: 'absolute', left: 16, right: 16, bottom: 14,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: isHero ? 28 : 22,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            color: 'white',
            textShadow: '0 1px 12px oklch(0 0 0 / 0.4)',
          }}>{event.title}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8,
        }}>
          <SportTag sport={event.sport} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)' }}>
            {event.org}{event.orgVerified ? ' ✓' : ''}
          </span>
        </div>
        <MetaRow event={event} />
        {event.deadline && (
          <div className="mono" style={{
            marginTop: 8, fontSize: 10, color: 'var(--hot)',
            letterSpacing: 0.04, textTransform: 'uppercase',
          }}>⚑ {event.deadline}</div>
        )}
      </div>
    </div>
  );
}

// Bottom nav
function BottomNav({ tab, onTab, safeArea }) {
  const items = [
    { id: 'discover', label: 'Discover', icon: Icon.radar },
    { id: 'map',      label: 'Map',      icon: Icon.pin },
    { id: 'saved',    label: 'Saved',    icon: Icon.cal },
    { id: 'riders',   label: 'Riders',   icon: Icon.users },
    { id: 'gear',     label: 'Gear',     icon: Icon.tag },
    { id: 'profile',  label: 'You',      icon: Icon.user },
  ];
  // On real phones, pad the home indicator with safe-area-inset-bottom; on the
  // desktop iPhone-frame mock, the existing 28px stays in the bib area.
  const bottomPad = safeArea
    ? 'calc(10px + env(safe-area-inset-bottom, 0px))'
    : '28px';
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      borderTop: '1px solid var(--line-soft)',
      background: 'oklch(0.18 0.018 240 / 0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      padding: `10px 4px ${bottomPad}`,
      display: 'flex', justifyContent: 'space-around',
      zIndex: 5,
    }}>
      {items.map(item => {
        const active = item.id === tab;
        return (
          <button
            key={item.id}
            onClick={() => onTab(item.id)}
            style={{
              appearance: 'none', border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '4px 4px', cursor: 'pointer',
              color: active ? 'var(--accent)' : 'var(--fg-dim)',
              flex: 1, minWidth: 0,
            }}
          >
            {item.icon(20)}
            <span className="mono" style={{
              fontSize: 8.5, letterSpacing: 0.06, textTransform: 'uppercase',
              fontWeight: active ? 700 : 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
            }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Top header
function TopBar({ title, left, right, sub }) {
  return (
    <div style={{
      padding: '4px 18px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 36,
      }}>
        <div style={{ width: 36 }}>{left}</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: 0.12, textTransform: 'uppercase',
          color: 'var(--fg-dim)',
        }}>{title}</div>
        <div style={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
      </div>
      {sub}
    </div>
  );
}

function IconBtn({ children, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none', border: 'none', background: 'transparent',
        width: 36, height: 36, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg)', cursor: 'pointer', position: 'relative',
      }}
    >
      {children}
      {badge && (
        <span style={{
          position: 'absolute', top: 4, right: 4,
          width: 8, height: 8, borderRadius: 999,
          background: 'var(--accent)',
        }}/>
      )}
    </button>
  );
}

// Featured pill — small, accent-colored, attention but not screaming.
function FeaturedBadge({ size = 'sm' }) {
  const fs = size === 'lg' ? 11 : 9;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'lg' ? '4px 10px' : '3px 7px',
      borderRadius: 4,
      background: 'var(--accent)',
      color: 'var(--accent-ink)',
      fontFamily: 'var(--font-mono)', fontWeight: 700,
      fontSize: fs, letterSpacing: 0.1, textTransform: 'uppercase',
    }}>
      ★ Featured
    </span>
  );
}

// Lightweight global toast — listens for `window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg } }))`
// and shows a slim pill at the top of the screen for 1.6s. Non-blocking, no library.
function ToastHost() {
  const [toast, setToast] = React.useState(null);  // { msg, action }
  const timerRef = React.useRef(null);
  React.useEffect(() => {
    const onToast = (e) => {
      const next = { msg: e.detail?.msg || '', action: e.detail?.action };
      setToast(next);
      clearTimeout(timerRef.current);
      // Action toasts (like "tap to refresh") get a longer dwell.
      const ttl = next.action ? 7000 : 1600;
      timerRef.current = setTimeout(() => setToast(null), ttl);
    };
    window.addEventListener('jr:toast', onToast);
    return () => {
      window.removeEventListener('jr:toast', onToast);
      clearTimeout(timerRef.current);
    };
  }, []);
  if (!toast?.msg) return null;
  const onTap = () => {
    if (toast.action === 'reload' && typeof window.__jrReloadForUpdate === 'function') {
      window.__jrReloadForUpdate();
    }
    setToast(null);
  };
  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        position: 'fixed', top: 'calc(env(safe-area-inset-top, 16px) + 16px)',
        left: '50%', transform: 'translateX(-50%)',
        padding: '10px 16px', borderRadius: 999,
        background: 'oklch(0.20 0.018 240 / 0.95)',
        color: 'var(--fg)',
        border: '1px solid var(--accent)',
        WebkitBackdropFilter: 'blur(14px)',
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
        zIndex: 9999,
        boxShadow: '0 8px 24px oklch(0 0 0 / 0.4)',
        appearance: 'none',
        cursor: toast.action ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >{toast.msg}</button>
  );
}

// Beta welcome banner — shown once, post-onboarding, while the app is in beta.
// Tells users this is early + how to give feedback. Dismiss writes to prefs so
// it doesn't reappear.
function BetaBanner({ onDismiss, feedbackUrl }) {
  return (
    <div style={{
      position: 'absolute', left: 12, right: 12,
      top: 'calc(env(safe-area-inset-top, 16px) + 16px)',
      background: 'linear-gradient(135deg, var(--accent), oklch(0.72 0.20 35))',
      color: 'var(--accent-ink)',
      padding: '12px 14px', borderRadius: 14,
      boxShadow: '0 8px 24px oklch(0 0 0 / 0.4)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      zIndex: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'oklch(0 0 0 / 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontWeight: 700,
      }}>★</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>You're in the beta.</div>
        <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.45 }}>
          Tell us what's broken or missing. Your feedback shapes what ships next.
        </div>
        {feedbackUrl && (
          <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', marginTop: 8,
            color: 'var(--accent-ink)', fontWeight: 700, fontSize: 12,
            textDecoration: 'underline',
          }}>Send feedback →</a>
        )}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" style={{
        appearance: 'none', border: 'none', background: 'transparent',
        color: 'var(--accent-ink)', cursor: 'pointer',
        width: 28, height: 28, padding: 0, fontSize: 18, lineHeight: 1,
        flexShrink: 0,
      }}>×</button>
    </div>
  );
}

Object.assign(window, { Icon, SportTag, MetaRow, EventCard, BottomNav, TopBar, IconBtn, ToastHost, BetaBanner, FeaturedBadge });
