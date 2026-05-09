// JamRadar — Auth screens (sign in / sign up / magic link)
// Spec: 18_marketplace_signup_and_kyc_plan.md (tiers 1 & 2 surface).
// Renders a "Sign-in coming soon" placeholder if Supabase isn't configured —
// keeps the deployed PWA functional even before the user wires up auth.

function AuthScreen({ initialMode = 'choose', onClose, onSignedIn }) {
  const configured = !!window.JR_SUPABASE_READY;
  const [mode, setMode] = React.useState(initialMode);
  // 'choose' (landing) | 'signin' | 'signup' | 'magic' | 'sent' | 'error'

  if (!configured) {
    return (
      <AuthShell title="Sign in" onBack={onClose}>
        <NotConfiguredNote/>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={titleFor(mode)} onBack={onClose}>
      {mode === 'choose' && <Landing onPick={setMode}/>}
      {mode === 'signin' && <SignInForm onSwitch={setMode} onSignedIn={onSignedIn}/>}
      {mode === 'signup' && <SignUpForm onSwitch={setMode} onSignedIn={onSignedIn}/>}
      {mode === 'magic'  && <MagicLinkForm onSwitch={setMode}/>}
    </AuthShell>
  );
}

function titleFor(mode) {
  return ({
    choose: 'Sign in', signin: 'Sign in', signup: 'Create account',
    magic: 'Magic link',
  })[mode] || 'Sign in';
}

// ─────── shell ───────
function AuthShell({ title, children, onBack }) {
  return (
    <div className="topo-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{
          appearance: 'none', border: 'none', cursor: 'pointer', background: 'transparent',
          color: 'var(--fg)', padding: 6,
        }}>{Icon.back(22)}</button>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
          {title}
        </div>
      </div>
      <div className="jr-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 32px' }}>
        {children}
      </div>
    </div>
  );
}

// ─────── landing ───────
function Landing({ onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
      <div className="mono" style={{
        fontSize: 11, letterSpacing: 0.14, textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 8,
      }}>JamRadar · sign in</div>
      <h1 style={{
        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 28, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 8,
      }}>Pick how you want to come in.</h1>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
        Signing in lets your saves, follows, and prefs travel between your devices.
        You can keep using the app without an account too.
      </p>

      <OAuthButton provider="google" onClick={() => window.JR_AUTH.signInWithGoogle()}/>
      <OAuthButton provider="apple"  onClick={() => window.JR_AUTH.signInWithApple()}/>

      <Divider/>

      <button onClick={() => onPick('magic')}  className="btn-ghost" style={{ width: '100%' }}>
        Email magic link
      </button>
      <button onClick={() => onPick('signin')} className="btn-ghost" style={{ width: '100%' }}>
        Email and password
      </button>
      <button onClick={() => onPick('signup')} className="mono" style={{
        appearance: 'none', border: 'none', background: 'transparent',
        color: 'var(--accent)', cursor: 'pointer', padding: '10px 0',
        fontSize: 12, letterSpacing: 0.08, textTransform: 'uppercase',
      }}>
        Create a new account →
      </button>
    </div>
  );
}

function OAuthButton({ provider, onClick }) {
  const meta = ({
    google: { label: 'Continue with Google', glyph: 'G' },
    apple:  { label: 'Continue with Apple',  glyph: '' },
  })[provider];
  return (
    <button onClick={onClick} style={{
      appearance: 'none', cursor: 'pointer', width: '100%',
      padding: '14px 16px', borderRadius: 12,
      background: 'white', color: '#0a0d12',
      border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 4,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700,
      }}>{meta.glyph}</span>
      {meta.label}
    </button>
  );
}

function Divider() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 6px',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }}/>
      <span className="mono" style={{
        fontSize: 10, color: 'var(--fg-dim)',
        letterSpacing: 0.1, textTransform: 'uppercase',
      }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }}/>
    </div>
  );
}

// ─────── sign-in (email + password) ───────
function SignInForm({ onSwitch, onSignedIn }) {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setErr(null); setBusy(true);
    const { data, error } = await window.JR_AUTH.signInWithPassword(email, pw);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (data?.user) onSignedIn?.(data.user);
  };

  return (
    <div>
      <Field label="Email" type="email"
        value={email} onChange={setEmail}
        placeholder="you@example.com" autoComplete="email"/>
      <Field label="Password" type="password"
        value={pw} onChange={setPw}
        placeholder="••••••••" autoComplete="current-password"/>
      {err && <ErrorBox msg={err}/>}
      <button onClick={submit} disabled={busy || !email || !pw} className="btn-accent" style={{
        width: '100%', marginTop: 16,
        opacity: (busy || !email || !pw) ? 0.5 : 1,
      }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <SwitchRow
        prompt="No account yet?"
        cta="Create one"
        onClick={() => onSwitch('signup')}/>
      <SwitchRow
        prompt="Forgot password?"
        cta="Send a magic link"
        onClick={() => onSwitch('magic')}/>
    </div>
  );
}

// ─────── sign-up (email + password) ───────
function SignUpForm({ onSwitch, onSignedIn }) {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async () => {
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setErr(null); setBusy(true);
    const { data, error } = await window.JR_AUTH.signUpWithPassword(email, pw);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    // Supabase returns a user immediately; if email confirmations are on,
    // the user must click the confirmation link before they can sign in.
    if (data?.user?.confirmed_at) {
      onSignedIn?.(data.user);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Sent
        title="Check your inbox"
        body={`We sent a confirmation link to ${email}. Click it to finish creating your account.`}
        onBack={() => onSwitch('signin')}/>
    );
  }

  return (
    <div>
      <Field label="Email" type="email"
        value={email} onChange={setEmail}
        placeholder="you@example.com" autoComplete="email"/>
      <Field label="Password" type="password"
        value={pw} onChange={setPw}
        placeholder="At least 8 characters" autoComplete="new-password"/>
      {err && <ErrorBox msg={err}/>}
      <button onClick={submit} disabled={busy || !email || !pw} className="btn-accent" style={{
        width: '100%', marginTop: 16,
        opacity: (busy || !email || !pw) ? 0.5 : 1,
      }}>{busy ? 'Creating…' : 'Create account'}</button>
      <SwitchRow
        prompt="Have an account?"
        cta="Sign in"
        onClick={() => onSwitch('signin')}/>
      <p className="mono" style={{
        marginTop: 18, fontSize: 10, color: 'var(--fg-dim)', lineHeight: 1.5,
      }}>By signing up you agree to JamRadar's terms and privacy policy. We'll never sell your data.</p>
    </div>
  );
}

// ─────── magic link ───────
function MagicLinkForm({ onSwitch }) {
  const [email, setEmail] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const submit = async () => {
    setErr(null); setBusy(true);
    const { error } = await window.JR_AUTH.signInWithMagicLink(email);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <Sent
        title="Magic link sent"
        body={`Check ${email} for a one-tap sign-in link. Tap it from this device for the smoothest result.`}
        onBack={() => onSwitch('choose')}/>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
        We'll email you a one-tap sign-in link — no password needed.
      </p>
      <Field label="Email" type="email"
        value={email} onChange={setEmail}
        placeholder="you@example.com" autoComplete="email"/>
      {err && <ErrorBox msg={err}/>}
      <button onClick={submit} disabled={busy || !email} className="btn-accent" style={{
        width: '100%', marginTop: 16,
        opacity: (busy || !email) ? 0.5 : 1,
      }}>{busy ? 'Sending…' : 'Send link'}</button>
      <SwitchRow
        prompt="Prefer password?"
        cta="Sign in with password"
        onClick={() => onSwitch('signin')}/>
    </div>
  );
}

// ─────── primitives ───────
function Field({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="mono" style={{
        fontSize: 9, letterSpacing: 0.12, textTransform: 'uppercase',
        color: 'var(--fg-dim)', marginBottom: 6,
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%', background: 'var(--bg-surface)',
          border: '1px solid var(--line-soft)', borderRadius: 10,
          padding: '12px 14px', color: 'var(--fg)', fontSize: 14,
        }}
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      marginTop: 10, padding: '10px 12px',
      background: 'var(--hot-soft)', color: 'var(--hot)',
      border: '1px solid oklch(0.72 0.20 35 / 0.4)',
      borderRadius: 8, fontSize: 13,
    }}>{msg}</div>
  );
}

function SwitchRow({ prompt, cta, onClick }) {
  return (
    <div style={{
      marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      fontSize: 13, color: 'var(--fg-muted)',
    }}>
      <span>{prompt}</span>
      <button onClick={onClick} style={{
        appearance: 'none', border: 'none', background: 'transparent',
        color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
        fontSize: 13, padding: 0,
      }}>{cta}</button>
    </div>
  );
}

function Sent({ title, body, onBack }) {
  return (
    <div style={{ paddingTop: 24, textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>{Icon.check(22)}</div>
      <h2 style={{
        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
        letterSpacing: '-0.02em', marginBottom: 10,
      }}>{title}</h2>
      <p style={{ margin: '0 auto 22px', maxWidth: 320, color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1.5 }}>
        {body}
      </p>
      <button onClick={onBack} className="btn-ghost" style={{ width: '100%' }}>Back</button>
    </div>
  );
}

function NotConfiguredNote() {
  return (
    <div style={{ paddingTop: 16 }}>
      <div className="mono" style={{
        fontSize: 11, letterSpacing: 0.14, textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 12,
      }}>Setup pending</div>
      <h2 style={{
        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
        letterSpacing: '-0.02em', marginBottom: 10,
      }}>Sign-in is being set up</h2>
      <p style={{ margin: '0 0 14px', color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1.55 }}>
        JamRadar is a single-device experience right now — your saves and follows live in
        local storage on this phone. Multi-device sync is coming soon.
      </p>
      <p style={{ margin: 0, color: 'var(--fg-dim)', fontSize: 12, lineHeight: 1.55 }}>
        For developers: see <span className="mono" style={{ color: 'var(--accent)' }}>AUTH-SETUP.md</span> in the project to wire up Supabase.
      </p>
    </div>
  );
}

window.AuthScreen = AuthScreen;
