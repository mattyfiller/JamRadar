// JamRadar — Supabase configuration
//
// To enable real auth + multi-user state, set these two values to your project's
// URL and anon key (from Supabase dashboard → Project Settings → API). Until
// you do, the app runs in "anonymous-only" mode using localStorage. Nothing
// breaks if it's left blank.
//
// SETUP: see AUTH-SETUP.md for the full playbook.

const JR_SUPABASE_URL  = 'https://rgxbhyhzulimznkphnrd.supabase.co';
const JR_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneGJoeWh6dWxpbXpua3BobnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzY0MTQsImV4cCI6MjA5Mzc1MjQxNH0.RjO3lF0Rqs4MNVvw-IIO5COmwtGp7IJORFop34HXABI';

// Initialize the Supabase client (or null if no config). All callers must check
// `window.JR_SUPABASE` for null before using it.
(function () {
  const hasConfig = JR_SUPABASE_URL && JR_SUPABASE_ANON;
  if (!hasConfig) {
    window.JR_SUPABASE = null;
    window.JR_SUPABASE_READY = false;
    console.info('[JamRadar] Supabase not configured — running in local-only mode.');
    return;
  }
  if (!window.supabase) {
    console.warn('[JamRadar] Supabase JS client did not load. Falling back to local-only mode.');
    window.JR_SUPABASE = null;
    window.JR_SUPABASE_READY = false;
    return;
  }
  window.JR_SUPABASE = window.supabase.createClient(JR_SUPABASE_URL, JR_SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,  // needed for magic-link + OAuth redirects
    },
  });
  // Expose the project URL so non-Supabase code (e.g. the photo-URL validator
  // in store.jsx publishListing) can derive the storage public-URL prefix.
  // The URL itself is not a secret; only the service-role key is.
  window.JR_SUPABASE_URL = JR_SUPABASE_URL;
  window.JR_SUPABASE_READY = true;
  console.info('[JamRadar] Supabase initialised.');
})();

// Lightweight wrappers callers can use without juggling the optional client.
window.JR_AUTH = {
  /** Returns the current Supabase user, or null. */
  getUser: async () => {
    if (!window.JR_SUPABASE) return null;
    const { data } = await window.JR_SUPABASE.auth.getUser();
    return data?.user || null;
  },

  /** Subscribe to auth state changes. Returns an unsubscribe fn. */
  onAuthChange: (cb) => {
    if (!window.JR_SUPABASE) return () => {};
    const { data: sub } = window.JR_SUPABASE.auth.onAuthStateChange((_event, session) => {
      cb(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  },

  signInWithPassword: async (email, password) => {
    if (!window.JR_SUPABASE) return { error: { message: 'Auth not configured' } };
    return window.JR_SUPABASE.auth.signInWithPassword({ email, password });
  },

  signUpWithPassword: async (email, password) => {
    if (!window.JR_SUPABASE) return { error: { message: 'Auth not configured' } };
    return window.JR_SUPABASE.auth.signUp({ email, password });
  },

  signInWithMagicLink: async (email) => {
    if (!window.JR_SUPABASE) return { error: { message: 'Auth not configured' } };
    return window.JR_SUPABASE.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/JamRadar.html' },
    });
  },

  signInWithGoogle: async () => {
    if (!window.JR_SUPABASE) return { error: { message: 'Auth not configured' } };
    return window.JR_SUPABASE.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/JamRadar.html' },
    });
  },

  signInWithApple: async () => {
    if (!window.JR_SUPABASE) return { error: { message: 'Auth not configured' } };
    return window.JR_SUPABASE.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin + '/JamRadar.html' },
    });
  },

  signOut: async () => {
    if (!window.JR_SUPABASE) return;
    return window.JR_SUPABASE.auth.signOut();
  },
};
