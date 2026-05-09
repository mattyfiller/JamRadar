// JamRadar — runtime config
//
// Edit these constants before deploying. Anything left blank degrades gracefully
// (the corresponding UI link/banner is hidden, not broken).

window.JR_CONFIG = {
  // Where beta testers send feedback. Mailto, Tally form, Discord invite, anything.
  // Leave '' to hide the "Send feedback" link in the beta banner + landing FAQ.
  FEEDBACK_URL: '',

  // Public-facing contact email (shown in landing.html FAQ).
  // Leave '' to hide the "Email me" link.
  CONTACT_EMAIL: '',

  // The org name treated as "the signed-in organizer" in the prototype's organizer
  // dashboard. Once real auth + multi-org is in place this comes from the user's row.
  PROTOTYPE_ORG_NAME: 'Blue Mountain Park Crew',
};
