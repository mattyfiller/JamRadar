// JamRadar — App shell

function App() {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accentHue": 100,
    "topoOpacity": 1,
    "darkStatusBar": true,
    "deviceMode": "rider"
  }/*EDITMODE-END*/);

  // Persistent app state (prefs, events, social) + current Supabase user (or null)
  const [state, actions, user] = useJamStore();
  const { prefs, events, savedIds, goingIds, followedOrgs, readNotifIds, notifications } = state;

  // Apply accent hue live
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', `oklch(0.88 0.18 ${tweaks.accentHue})`);
    root.style.setProperty('--accent-soft', `oklch(0.88 0.18 ${tweaks.accentHue} / 0.15)`);
    root.style.setProperty('--accent-ink', `oklch(0.20 0.04 ${tweaks.accentHue})`);
    root.style.setProperty('--topo-opacity', tweaks.topoOpacity);
  }, [tweaks.accentHue, tweaks.topoOpacity]);

  // Route lives outside the store — it's session, not persisted.
  // First-time users land in onboarding; returning users go straight to main.
  // Organizer accounts boot directly into the org dashboard.
  const [tab, setTab] = React.useState('discover');
  const [route, setRoute] = React.useState(() => {
    if (!prefs.onboarded) return 'onboarding';
    if (prefs.accountType === 'organizer') return 'org';
    if (prefs.accountType === 'shop')      return 'shop';
    return 'main';
  });
  const [openEventId, setOpenEventId] = React.useState(null);
  const [openOrgName, setOpenOrgName] = React.useState(null);
  const [openRiderId, setOpenRiderId] = React.useState(null);
  const [openListingId, setOpenListingId] = React.useState(null);
  const [orgRoute, setOrgRoute] = React.useState('dashboard'); // dashboard | create | edit
  const [shopRoute, setShopRoute] = React.useState('dashboard'); // dashboard | post
  const [gearMode, setGearMode] = React.useState('deals');       // 'deals' | 'market' — lifted to app so it survives route nav
  const [editingEventId, setEditingEventId] = React.useState(null);
  // Where did the user open the EventDetail from? Used so the back chevron
  // returns to admin/org/main instead of unconditionally main.
  const [eventDetailFrom, setEventDetailFrom] = React.useState('main');

  // Switching device mode jumps to the matching dashboard.
  React.useEffect(() => {
    if (tweaks.deviceMode === 'organizer' && route !== 'org') setRoute('org');
    else if (tweaks.deviceMode === 'admin' && route !== 'admin') setRoute('admin');
    // Shop mode is NOT in this branch on purpose. The shop dashboard can be
    // reached from any deviceMode (it's a function of accountType, not a
    // separate device persona) so we don't auto-bounce out of route='shop'
    // when deviceMode is 'rider'. Only org / admin routes are mode-coupled.
    else if (tweaks.deviceMode === 'rider' && (route === 'org' || route === 'admin')) setRoute('main');
  }, [tweaks.deviceMode]);

  const openEvent = (id, from) => {
    setOpenEventId(id);
    // Capture origin so EventDetail's back returns the user to where they came
    // from (admin queue, org dashboard, or rider main). When `from` isn't
    // explicit, infer from current route — admin/org callers stay in their
    // mode; everyone else resolves to 'main'.
    setEventDetailFrom(from || (route === 'admin' ? 'admin' : route === 'org' ? 'org' : 'main'));
    setRoute('detail');
  };
  const openOrg = (name) => {
    setOpenOrgName(name);
    setRoute('orgProfile');
  };
  const openRider = (id) => {
    setOpenRiderId(id);
    setRoute('riderProfile');
  };
  const openListing = (id) => {
    setOpenListingId(id);
    setRoute('listing');
  };

  // Deep-link state — capture the params on first mount and consume them
  // once we have the prerequisites (onboarding done + Supabase events loaded).
  // Without this, two failure modes were possible:
  //   - First-time user opens a shared listing link → app shows the listing
  //     but skips onboarding entirely. Their prefs stay at defaults forever.
  //   - Cold load with ?event=<id> → events array is empty for ~1 second
  //     while Supabase fetches; the original useEffect ran once and silently
  //     dropped the param if the event wasn't loaded yet.
  // Now: park the params, consume after onboarding + when target is loadable.
  const [pendingDeepLink, setPendingDeepLink] = React.useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    const listingId = params.get('listing');
    const sale = params.get('sale');
    const stripeOnboarding = params.get('stripe_onboarding');
    if (!eventId && !listingId && !sale && !stripeOnboarding) return null;
    return { event: eventId, listing: listingId, sale, stripeOnboarding };
  });

  // Sale-success + Stripe-onboarding return paths fire one-shot toasts and
  // clear the URL. These don't need to wait for onboarding — they're return
  // trips from external flows the user already initiated.
  React.useEffect(() => {
    if (!pendingDeepLink) return;
    const { sale, stripeOnboarding } = pendingDeepLink;
    if (sale === 'success') {
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Payment received — seller will be notified' },
      }));
      window.history.replaceState({}, '', window.location.pathname);
      setPendingDeepLink(p => p?.listing ? { listing: p.listing } : null);  // keep the listing target if any
    } else if (stripeOnboarding === 'complete') {
      window.dispatchEvent(new CustomEvent('jr:toast', {
        detail: { msg: 'Payouts set up. You can now sell with in-app payments.' },
      }));
      window.history.replaceState({}, '', window.location.pathname);
      setPendingDeepLink(null);
    } else if (stripeOnboarding === 'refresh') {
      // User abandoned mid-flow; we don't auto-redirect. They tap Set up
      // payouts again to resume.
      window.history.replaceState({}, '', window.location.pathname);
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink?.sale, pendingDeepLink?.stripeOnboarding]);

  // Browser-back support: when we open a deep-linked screen, push a real
  // history entry so iOS/Android system-back returns the user to a clean
  // /main view instead of exiting the app entirely (was bug A2 from audit).
  React.useEffect(() => {
    const onPop = () => {
      // System back from a JamRadar route → land on rider main.
      setOpenEventId(null);
      setOpenListingId(null);
      setRoute('main');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Consume the deep link as soon as it's safe.
  React.useEffect(() => {
    if (!pendingDeepLink) return;
    // Don't bypass onboarding. New user hits a shared link → they finish
    // onboarding first, then the link is consumed automatically.
    if (!prefs.onboarded) return;

    const { event: eventId, listing: listingId } = pendingDeepLink;
    if (eventId) {
      // Wait for the event to be present in the local store. Retry on each
      // events-array change rather than dropping silently.
      if (events.find(e => e.id === eventId)) {
        // Push a real entry so back works properly.
        window.history.pushState({}, '', window.location.pathname);
        openEvent(eventId);
        setPendingDeepLink(null);
      }
      return;
    }
    if (listingId) {
      window.history.pushState({}, '', window.location.pathname);
      openListing(listingId);
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, prefs.onboarded, events]);

  // Build the screen
  let content = null;

  if (route === 'onboarding') {
    content = (
      <Onboarding
        defaults={prefs}
        onDone={(p) => {
          actions.completeOnboarding(p);
          // Organizers + shops boot straight into their dashboard so they can
          // post their first event/deal immediately. Riders go to Discover.
          if (p.accountType === 'organizer') {
            setTweak('deviceMode', 'organizer');
            setRoute('org');
          } else if (p.accountType === 'shop') {
            setRoute('shop');
          } else {
            setRoute('main');
          }
        }}
      />
    );
  } else if (route === 'detail') {
    content = (
      <EventDetail
        id={openEventId}
        events={events}
        onBack={() => {
          setOpenEventId(null);
          // Return to the route that opened this event detail (admin/org/main).
          setRoute(eventDetailFrom || 'main');
        }}
        onSave={actions.toggleSaved}
        savedIds={savedIds}
        goingIds={goingIds}
        onToggleGoing={actions.toggleGoing}
        followedOrgs={followedOrgs}
        onToggleFollow={actions.toggleFollow}
        onOpenOrg={openOrg}
      />
    );
  } else if (route === 'auth') {
    content = (
      <AuthScreen
        onClose={() => setRoute('main')}
        onSignedIn={() => setRoute('main')}
      />
    );
  } else if (route === 'orgProfile') {
    content = (
      <OrgProfile
        orgName={openOrgName}
        events={events}
        savedIds={savedIds}
        followedOrgs={followedOrgs}
        onToggleFollow={actions.toggleFollow}
        onOpenEvent={openEvent}
        onSave={actions.toggleSaved}
        onBack={() => setRoute('main')}
      />
    );
  } else if (route === 'riderProfile') {
    content = (
      <RiderProfile
        riderId={openRiderId}
        events={events}
        savedIds={savedIds}
        isGuest={!user}
        onOpenEvent={openEvent}
        onSave={actions.toggleSaved}
        onBack={() => setRoute('main')}
      />
    );
  } else if (route === 'notifications') {
    content = (
      <NotificationsScreen
        onBack={() => setRoute('main')}
        readIds={readNotifIds}
        dynamicNotifs={notifications}
        onMarkAllRead={actions.markAllNotifsRead}
      />
    );
  } else if (route === 'org') {
    if (orgRoute === 'create') {
      content = (
        <CreateEventScreen
          prefs={prefs}
          onBack={() => setOrgRoute('dashboard')}
          onPublish={(ev) => { actions.publishEvent(ev); setOrgRoute('dashboard'); }}
          findDuplicates={actions.findDuplicates}
        />
      );
    } else if (orgRoute === 'edit') {
      const editing = events.find(e => e.id === editingEventId);
      content = (
        <CreateEventScreen
          prefs={prefs}
          editing={editing}
          onBack={() => { setEditingEventId(null); setOrgRoute('dashboard'); }}
          onPublish={(ev) => {
            actions.editEvent(editingEventId, ev);
            setEditingEventId(null);
            setOrgRoute('dashboard');
          }}
          findDuplicates={actions.findDuplicates}
        />
      );
    } else {
      content = (
        <OrgDashboard
          events={events}
          prefs={prefs}
          followedOrgs={followedOrgs}
          onToggleFollow={actions.toggleFollow}
          onCreateEvent={() => setOrgRoute('create')}
          onEditEvent={(id) => { setEditingEventId(id); setOrgRoute('edit'); }}
          onBack={() => { setTweak('deviceMode', 'rider'); setRoute('main'); }}
          onOpenEvent={openEvent}
        />
      );
    }
  } else if (route === 'admin') {
    content = (
      <AdminDashboard
        events={events}
        onApprove={actions.approveEvent}
        onReject={actions.rejectEvent}
        onFeature={actions.featureEvent}
        onVerifyOrg={actions.verifyOrg}
        onOpenEvent={openEvent}
        onBack={() => { setTweak('deviceMode', 'rider'); setRoute('main'); }}
        fetchPendingMerges={actions.fetchPendingMerges}
        resolvePendingMerge={actions.resolvePendingMerge}
      />
    );
  } else if (route === 'listing') {
    content = (
      <ListingDetail
        listingId={openListingId}
        onBack={() => { setOpenListingId(null); setRoute('main'); setTab('gear'); }}
        onMarkSold={actions.markListingSold}
        onWithdraw={actions.withdrawListing}
        onBuyNow={actions.createCheckoutSession}
      />
    );
  } else if (route === 'sell') {
    // Gate the sell flow on auth — without a session, the photo upload would
    // toast "Sign in first" and the publish would throw, with no way out.
    // Bouncing them to the auth screen keeps the flow legible.
    if (!user) {
      content = (
        <AuthScreen
          onClose={() => { setRoute('main'); setTab('gear'); }}
          onSignedIn={() => setRoute('sell')}
        />
      );
    } else {
      content = (
        <PostListingScreen
          prefs={prefs}
          onPublish={async (listing) => {
            try {
              await actions.publishListing(listing);
              setRoute('main'); setTab('gear');
            } catch (e) {
              window.dispatchEvent(new CustomEvent('jr:toast', { detail: { msg: e.message || 'Failed to list' } }));
            }
          }}
          onBack={() => { setRoute('main'); setTab('gear'); }}
        />
      );
    }
  } else if (route === 'shop') {
    if (shopRoute === 'post') {
      content = (
        <PostDealScreen
          prefs={prefs}
          onPublish={async (deal) => {
            await actions.publishDeal(deal);
            setShopRoute('dashboard');
          }}
          onBack={() => setShopRoute('dashboard')}
        />
      );
    } else {
      content = (
        <ShopDashboard
          prefs={prefs}
          onPostDeal={() => setShopRoute('post')}
          onBack={() => { setTweak('deviceMode', 'rider'); setRoute('main'); }}
        />
      );
    }
  } else {
    // Main tab content
    if (tab === 'discover') {
      const allNotifs = [...notifications, ...window.JR_DATA.NOTIFICATIONS];
      const hasUnread = allNotifs.some(n => n.unread && !readNotifIds.includes(n.id));
      content = (
        <DiscoverScreen
          events={events}
          prefs={prefs}
          savedIds={savedIds}
          isGuest={!user}
          onOpenEvent={openEvent}
          onSave={actions.toggleSaved}
          onOpenRider={openRider}
          onOpenRidersTab={() => setTab('riders')}
          onOpenNotifs={() => setRoute('notifications')}
          hasUnreadNotifs={hasUnread}
        />
      );
    } else if (tab === 'map') {
      content = (
        <MapScreen
          events={events}
          prefs={prefs}
          onOpenEvent={openEvent}
          savedIds={savedIds}
          onSave={actions.toggleSaved}
        />
      );
    } else if (tab === 'saved') {
      content = (
        <SavedScreen
          events={events}
          onOpenEvent={openEvent}
          savedIds={savedIds}
          onSave={actions.toggleSaved}
        />
      );
    } else if (tab === 'gear') {
      content = (
        <GearScreen
          prefs={prefs}
          mode={gearMode}
          onModeChange={setGearMode}
          onOpenListing={openListing}
          onSellGear={() => setRoute('sell')}
        />
      );
    } else if (tab === 'riders') {
      content = <RidersScreen prefs={prefs} isGuest={!user} onOpenRider={openRider}/>;
    } else {
      content = (
        <ProfileScreen
          prefs={prefs}
          savedIds={savedIds}
          goingIds={goingIds}
          events={events}
          user={user}
          onOpenAuth={() => setRoute('auth')}
          onSignOut={async () => { await window.JR_AUTH?.signOut(); }}
          onSetPrefs={actions.setPrefs}
          onSwitchToOrgMode={() => { setTweak('deviceMode', 'organizer'); setRoute('org'); }}
          onSwitchToShopMode={() => { setRoute('shop'); }}
          onSwitchToAdminMode={() => { setTweak('deviceMode', 'admin'); setRoute('admin'); }}
          onSetupStripe={() => actions.startStripeOnboarding()}
          onResetAll={actions.resetAll}
        />
      );
    }
  }

  const showBottomNav = route === 'main';
  const dark = true; // Always dark mode

  // Native-app feel: when running as a PWA (added to home screen) or on a phone-sized
  // viewport, skip the desktop iPhone-frame illusion and let the app fill the screen.
  const [isPhone, setIsPhone] = React.useState(() => detectPhone());
  React.useEffect(() => {
    const onResize = () => setIsPhone(detectPhone());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Show the beta banner once: post-onboarding, on the main route, until dismissed.
  const showBetaBanner = route === 'main' && prefs.onboarded && !prefs.betaBannerSeen;
  // Configured in config.jsx. Empty → the banner hides the "Send feedback" link.
  const FEEDBACK_URL = window.JR_CONFIG?.FEEDBACK_URL || '';

  // Inner content is identical across the two shells.
  const inner = (
    <div style={{
      height: '100%', position: 'relative', overflow: 'hidden',
      background: 'var(--bg-base)', color: 'var(--fg)',
    }}>
      {/* No `key` prop — keying on route+tab forced a full unmount on every
          navigation, blowing away map zoom, Discover scroll position, and
          GearScreen's deals/for-sale segment selection. Each route renders a
          different component anyway, so React's reconciler handles diffing
          fine without forcing remounts. */}
      <div style={{
        position: 'absolute', inset: 0,
        paddingTop: isPhone
          ? 'calc(env(safe-area-inset-top, 0px) + 8px)'
          : 62,
        paddingBottom: showBottomNav
          ? (isPhone ? 'calc(86px + env(safe-area-inset-bottom, 0px))' : 86)
          : (isPhone ? 'env(safe-area-inset-bottom, 0px)' : 0),
        display: 'flex', flexDirection: 'column',
      }}>
        {content}
      </div>
      {showBetaBanner && (
        <BetaBanner
          feedbackUrl={FEEDBACK_URL}
          onDismiss={() => actions.setPrefs({ betaBannerSeen: true })}
        />
      )}
      {showBottomNav && <BottomNav tab={tab} onTab={setTab} safeArea={isPhone}/>}
    </div>
  );

  if (isPhone) {
    // Fullscreen phone shell: no iPhone frame, no tweaks panel.
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg-base)', color: 'var(--fg)',
        overflow: 'hidden',
      }}>
        {inner}
        <ToastHost/>
      </div>
    );
  }

  // Desktop preview shell with the iPhone frame + tweaks panel.
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 30% 20%, oklch(0.18 0.02 240) 0%, #050709 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <IOSDevice width={402} height={874} dark={dark}>
        {inner}
      </IOSDevice>

      <ToastHost/>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Look">
          <TweakSlider label="Accent hue"
            value={tweaks.accentHue} min={0} max={360} step={5}
            onChange={(v) => setTweak('accentHue', v)}
            help="0=red · 30=orange · 100=lime · 200=teal · 280=violet"/>
          <TweakSlider label="Topo line density"
            value={tweaks.topoOpacity} min={0} max={2} step={0.1}
            onChange={(v) => setTweak('topoOpacity', v)}/>
        </TweakSection>
        <TweakSection title="Mode">
          <TweakRadio label="Device"
            value={tweaks.deviceMode}
            options={[['rider', 'Rider'], ['organizer', 'Organizer'], ['admin', 'Admin']]}
            onChange={(v) => setTweak('deviceMode', v)}/>
        </TweakSection>
        <TweakSection title="Navigation">
          <TweakRadio label="Start at"
            value={route === 'onboarding' ? 'onboarding' : 'main'}
            options={[['main', 'App'], ['onboarding', 'Onboarding']]}
            onChange={(v) => setRoute(v)}/>
          <TweakRadio label="Tab"
            value={tab}
            options={[['discover', 'Disc'], ['map', 'Map'], ['saved', 'Saved'], ['riders', 'Riders'], ['gear', 'Gear'], ['profile', 'You']]}
            onChange={(v) => { setTab(v); setRoute('main'); }}/>
          <TweakButton label="Open notifications" onClick={() => setRoute('notifications')}/>
          <TweakButton label="Open sample event" onClick={() => openEvent(events[0]?.id)}/>
          <TweakButton label="Reset onboarding + data" onClick={actions.resetAll}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Treat the page as "phone mode" when it's been installed as a PWA, on iOS Safari's
// home-screen mode, or whenever the viewport is narrower than a typical iPad column.
// Either condition is enough — desktop devs can still resize down to test.
function detectPhone() {
  if (typeof window === 'undefined') return false;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  return standalone || window.innerWidth < 540;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
