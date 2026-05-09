# 16 - Developer Build Prompt

Use this prompt to ask an AI coding assistant or developer to build the JamRadar MVP.

---

## Build Prompt

I want to build a mobile-first app called JamRadar.

JamRadar is an event discovery and notification app for ski, snowboard, rail jam, mountain, indoor training, skate, and action-sport events.

Users should be able to:

- Create an account
- Set their location
- Choose a notification radius
- Select sports they care about
- Select event types they care about
- View a personalized event feed
- View events on a map
- Save events
- Receive notifications for relevant events
- Get reminders for saved events and registration deadlines
- Browse gear deals

Organizers should be able to:

- Create an organization account
- Create an organization profile
- Post events
- Edit events
- Upload event images
- Add registration links
- Add booking links for indoor training sessions
- View basic analytics

Admin users should be able to:

- Approve events
- Approve organizations
- Edit event details
- Remove spam
- Feature events

The MVP should include these event types:

- Rail jam
- Terrain park event
- Ski competition
- Snowboard competition
- Demo day
- Indoor ski/snowboard training session
- Gear swap
- Skate jam

The app should support these organization types:

- Mountain/resort
- Indoor ski/snowboard training facility
- Ski/snowboard shop
- Skate shop
- Brand
- Club
- Event organizer
- Skatepark

Recommended stack:

- Frontend: React Native with Expo
- Backend: FastAPI or Node.js
- Database: PostgreSQL with PostGIS for radius search
- Auth: Supabase Auth, Firebase Auth, or JWT
- Storage: Supabase Storage, S3, or Cloudflare R2
- Notifications: Expo Push Notifications or OneSignal
- Payments later: Stripe

Core screens:

1. Onboarding
2. Login/Register
3. Preference setup
4. Discover feed
5. Event detail
6. Map
7. Saved/calendar
8. Gear deals
9. Organizer dashboard
10. Create event
11. Admin dashboard

Core data models:

- User
- Organization
- Event
- SavedEvent
- NotificationPreference
- GearDeal
- AdminUser

Important requirements:

- Events must be searchable by radius.
- Users must be able to filter by sport and event type.
- Notifications must respect user preferences.
- Indoor ski/snowboard treadmill facilities should be supported as organizations.
- Gear deals should be supported but the used gear marketplace can be Phase 2.
- The UI should be mobile-first, clean, dark-mode friendly, and event-card based.

Build the app step by step with complete files, not partial snippets.

---

