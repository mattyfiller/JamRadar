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
    return 'main';
  });
  const [openEventId, setOpenEventId] = React.useState(null);
  const [openOrgName, setOpenOrgName] = React.useState(null);
  const [openRiderId, setOpenRiderId] = React.useState(null);
  const [orgRoute, setOrgRoute] = React.useState('dashboard'); // dashboard | create | edit
  const [editingEventId, setEditingEventId] = React.useState(null);

  // Switching device mode jumps to the matching dashboard.
  React.useEffect(() => {
    if (tweaks.deviceMode === 'organizer' && route !== 'org') setRoute('org');
    else if (tweaks.deviceMode === 'admin' && route !== 'admin') setRoute('admin');
    else if (tweaks.deviceMode === 'rider' && (route === 'org' || route === 'admin')) setRoute('main');
  }, [tweaks.deviceMode]);

  const openEvent = (id) => {
    setOpenEventId(id);
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

  // Deep-link support: /JamRadar.html?event=e1 opens that event on first paint.
  // Useful when a rider shares an event URL via the share button.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    if (eventId && events.find(e => e.id === eventId)) {
      openEvent(eventId);
      // Clean the URL so a refresh / back doesn't re-trigger the deep-link.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Build the screen
  let content = null;

  if (route === 'onboarding') {
    content = (
      <Onboarding
        defaults={prefs}
        onDone={(p) => {
          actions.completeOnboarding(p);
          // Organizers boot straight into the org dashboard so they can
          // post their first event immediately.
          if (p.accountType === 'organizer') {
            setTweak('deviceMode', 'organizer');
            setRoute('org');
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
        onBack={() => setRoute('main')}
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
      content = <GearScreen prefs={prefs}/>;
    } else if (tab === 'riders') {
      content = <RidersScreen prefs={prefs} onOpenRider={openRider}/>;
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
          onSwitchToAdminMode={() => { setTweak('deviceMode', 'admin'); setRoute('admin'); }}
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
      <div key={`${route}-${tab}-${orgRoute}`} style={{
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
