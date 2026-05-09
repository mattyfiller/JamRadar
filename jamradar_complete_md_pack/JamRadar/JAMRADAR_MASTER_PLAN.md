# JamRadar Master Plan

## 1. Concept

JamRadar is a mobile app for discovering ski, snowboard, rail jam, mountain, indoor training, skate, and action-sport events in one place.

Users set their location, radius, sports, event interests, and notification preferences. Mountains, shops, indoor facilities, brands, clubs, and organizers post events and updates.

The app solves the problem of scattered event information across Instagram, resort websites, local shops, posters, and group chats.

## 2. One-Sentence Pitch

JamRadar helps riders find nearby rail jams, mountain events, indoor training sessions, skate jams, gear swaps, and gear deals without following dozens of scattered accounts.

## 3. Core Problem

People miss events because event information is fragmented.

They may need to check:

- Resort websites
- Instagram pages
- Local shops
- Brand accounts
- Eventbrite
- Posters
- Group chats
- Friends' stories

JamRadar centralizes this and only notifies users about what they actually care about.

## 4. Main Users

### Riders

- Skiers
- Snowboarders
- Park riders
- Skateboarders
- MTB riders later
- BMX riders later

### Organizations

- Mountains/resorts
- Indoor ski/snowboard treadmill facilities
- Ski shops
- Snowboard shops
- Skate shops
- Brands
- Clubs
- Event organizers
- Skateparks

## 5. Main Features

### User Features

- Account creation
- Location/radius setup
- Sport preferences
- Event type preferences
- Personalized event feed
- Map view
- Calendar view
- Saved events
- Push notifications
- Registration reminders
- Gear deals
- Eventually used gear marketplace

### Organizer Features

- Organization profile
- Event creation
- Event editing
- Event image upload
- Registration/booking links
- Event update notifications
- Analytics
- Sponsored placement

### Admin Features

- Approve events
- Verify organizations
- Remove spam
- Feature events
- Moderate marketplace listings

## 6. Event Types

Winter:

- Rail jams
- Terrain park events
- Ski competitions
- Snowboard competitions
- Banked slaloms
- Demo days
- Freestyle clinics
- Mountain festivals
- Film nights
- Gear swaps

Indoor:

- Ski treadmill lessons
- Snowboard treadmill lessons
- Freestyle prep sessions
- Race training
- Pre-season clinics
- Summer training camps
- Private coaching

Off-season:

- Skate jams
- Skatepark contests
- MTB races
- Bike park events
- BMX jams
- Gear swaps
- Shop nights
- Tuning clinics
- Film premieres

## 7. Indoor Ski/Snowboard Treadmill Facilities

Indoor facilities are a strong fit because they help JamRadar stay useful year-round.

They can post:

- Beginner lessons
- Private coaching
- Freestyle sessions
- Race training
- Pre-season tune-ups
- Summer camps
- Adult lessons
- Youth programs
- Package deals

Recommended MVP support:

- Indoor facility profiles
- Indoor session event type
- Booking links
- Indoor/outdoor filter
- Notifications for nearby indoor sessions

Do not build full booking in MVP. Link to the facility booking page first.

## 8. Gear Deals

Gear deals are a strong monetization path.

Users may want deals for:

- Skis
- Snowboards
- Boots
- Bindings
- Helmets
- Goggles
- Jackets
- Gloves
- Wax
- Tuning tools
- Skateboards
- Wheels
- Trucks
- MTB gear later

Gear deals should be filtered by:

- Sport
- Location
- Category
- Size
- Brand
- Budget

Revenue options:

- Affiliate links
- Sponsored gear placements
- Shop subscriptions
- Coupon codes
- Event sponsor deals

## 9. Used Gear Marketplace

A used gear marketplace is a good idea, but should be Phase 2 or Phase 3.

Why it works:

- Gear is expensive.
- Riders often upgrade.
- Kids outgrow gear.
- Shops sell used/demo gear.
- Local pickup is useful.

Marketplace features:

- List used gear
- Browse used gear
- Filter by size, price, condition, distance
- Seller profiles
- Buyer/seller messaging
- Local pickup
- Shipping later
- Secure payments later

Revenue:

- 5%-10% transaction fee
- Boosted listings
- Shop used gear accounts
- Verified seller tools

Safety needs:

- Scam reporting
- Listing moderation
- Seller ratings
- Condition photos
- Used helmet safety warnings
- Stolen gear reporting

Recommendation:

MVP should include gear deals and gear swap events, not full marketplace payments.

## 10. Monetization

Best early monetization:

1. Organizer subscriptions
2. Featured event listings
3. Shop promotions
4. Indoor facility promoted sessions
5. Gear affiliate links
6. Sponsored deal placements
7. Used gear marketplace fees later
8. Premium user subscription later

Do not charge normal users at first.

## 11. MVP Scope

The MVP should include:

- User accounts
- Location/radius setup
- Event preferences
- Event feed
- Event details
- Save events
- Push notifications
- Map view
- Organizer event posting
- Indoor facility support
- Gear deals
- Admin approval tools

MVP should not include:

- Full used gear marketplace payments
- Complex social media feed
- Built-in registration payments
- Full booking engine
- Advanced AI imports

## 12. Launch Strategy

Start in one region.

Possible first region:

- Ontario
- Banff/Canmore
- Whistler/Squamish/Vancouver
- Quebec
- Interior BC

Before launch, seed:

- 50+ events
- 20+ venue profiles
- 10+ shops/facilities
- 10+ gear deals or shop posts

Launch channels:

- Instagram
- TikTok
- Local shops
- QR posters
- Ski/snowboard clubs
- Reddit/local communities
- Partnerships with shops and indoor facilities

## 13. Technical Roadmap

Recommended stack:

- Frontend: React Native with Expo
- Backend: FastAPI or Node.js
- Database: PostgreSQL with PostGIS
- Auth: Supabase Auth, Firebase Auth, or JWT
- Storage: Supabase Storage, S3, or Cloudflare R2
- Notifications: Expo Push Notifications or OneSignal
- Payments later: Stripe

Core models:

- User
- Organization
- Event
- SavedEvent
- NotificationPreference
- GearDeal
- MarketplaceListing later

## 14. Long-Term Vision

JamRadar can become the default discovery layer for action-sport culture.

It starts with:

- Rail jams
- Mountain events
- Indoor training
- Gear deals

Then expands into:

- Skate
- MTB
- BMX
- Used gear marketplace
- Event registration
- Crew planning
- AI event importing
- Weekend planner

The strongest version of JamRadar is not just an event calendar. It is a personalized local radar for what to ride, where to train, what to attend, and where to find gear.

