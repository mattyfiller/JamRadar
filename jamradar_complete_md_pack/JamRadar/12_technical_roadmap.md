# 12 - Technical Roadmap

## Recommended Tech Stack

### Frontend Option 1: React Native with Expo

Best if the goal is a true mobile app with push notifications.

Pros:

- Faster mobile development
- iOS and Android from one codebase
- Good push notification support
- Good location support

### Frontend Option 2: Next.js Mobile-First Web App

Best if the goal is to test quickly.

Pros:

- Easier deployment
- Easier SEO
- Easier sharing
- Faster iteration

### Backend

Recommended:

- Node.js with NestJS or Express, or
- Python FastAPI

Both are fine. FastAPI is clean and familiar if the builder already likes Python.

### Database

Recommended:

- PostgreSQL
- PostGIS extension for radius/location search

PostGIS is important for finding events within a user's chosen radius.

### Storage

Use cloud storage for event images:

- AWS S3
- Cloudflare R2
- Supabase Storage

### Authentication

Options:

- Firebase Auth
- Supabase Auth
- Custom JWT auth
- Auth0

For MVP, Supabase is a strong option because it can handle auth, database, storage, and real-time features.

### Push Notifications

Options:

- Expo Push Notifications
- Firebase Cloud Messaging
- OneSignal

OneSignal can be useful for marketing-style notification segments.

### Payments

Use Stripe for:

- Organizer subscriptions
- Featured event payments
- Marketplace transactions later

## Core Data Models

### User

Fields:

- id
- name
- email
- location
- radius_km
- sports_interests
- event_type_interests
- notification_preferences
- created_at

### Organization

Fields:

- id
- name
- type
- location
- website
- social_links
- verified_status
- subscription_tier
- created_at

Organization types:

- mountain
- indoor_facility
- shop
- brand
- club
- skatepark
- event_organizer

### Event

Fields:

- id
- organization_id
- title
- description
- sport
- event_type
- start_time
- end_time
- location
- latitude
- longitude
- cost
- registration_link
- registration_deadline
- skill_level
- image_url
- status
- created_at

### GearDeal

Fields:

- id
- organization_id
- title
- description
- sport
- category
- price
- discount
- affiliate_url
- location
- start_date
- end_date
- sponsored_status

### MarketplaceListing, Phase 2/3

Fields:

- id
- seller_id
- title
- description
- sport
- category
- size
- condition
- price
- location
- shipping_available
- images
- status

## Important Backend Features

- Radius search
- Event filtering
- Notification matching
- Organizer verification
- Admin approval
- Event change tracking
- Analytics tracking
- Affiliate click tracking
- Sponsored placement logic

## Suggested Build Phases

### Phase 1: Prototype

- Event feed
- Static event data
- Radius filtering
- Basic user preferences

### Phase 2: MVP

- Real database
- User auth
- Organizer dashboard
- Event posting
- Push notifications
- Map view
- Gear deals

### Phase 3: Monetization

- Paid featured events
- Shop promotions
- Affiliate tracking
- Subscription tiers

### Phase 4: Marketplace

- Used gear listings
- Messaging
- Seller profiles
- Transaction system

### Phase 5: Advanced Features

- Crew mode
- AI event importing assistant
- Event recommendations
- Weather integration
- Trip planner
- Calendar sync

