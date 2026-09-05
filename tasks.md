# Implementation Plan: Cooperative Gig Services Platform (SIH089 / SIH26089)
This document outlines a strict, production-ready, step-by-step implementation plan for building the Cooperative Gig Services Platform. Designed for AI coding assistants (like Cursor, Windsurf, or v0), this checklist is split into three core phases to allow modular, error-free execution.

---

## Phase 1: React PWA Frontend Development
*Focus: Build a mobile-first Progressive Web App (PWA) with offline-first capabilities, establishing distinct views for clients, workers, and administrators, and setting up global state management.*

### [ ] Task 1.1: Initialize the Project and PWA Foundation
- [ ] Initialize a React application with TypeScript, Vite, and TailwindCSS.
- [ ] Create a `manifest.json` in the `public/` directory specifying:
  - App name, short name, start URL (`/`), theme colors, background colors, and displays (`standalone`).
  - Icons for standard, maskable, and splash screens.
- [ ] Implement a custom `service-worker.js` to handle offline-first caching of key static assets (HTML, JS, CSS, icons, and base illustrations).
- [ ] Write service worker logic to intercept network requests, enabling the worker-side application to view pending schedules and cached gigs in basement areas or locations with patchy rural internet connections.
- [ ] Register the service worker inside `main.tsx` and provide an in-app visual indicator showing "Online/Offline" sync status.

### [ ] Task 1.2: Set Up Global State Management (Zustand Store)
- [ ] Create a centralized global store `useBookingStore.ts` using Zustand to manage booking workflow states.
- [ ] Expose the following strictly typed variables and state mutators in the store:
  - `serviceCategory` (string | null): Active category (e.g., 'Plumbing', 'Electrical', 'Caregiving').
  - `clientLocation` ({ latitude: number, longitude: number } | null): Geolocation coordinates.
  - `selectedWorker` (WorkerProfile | null): Registered profile details of the matched worker.
  - `escrowStatus` ('IDLE' | 'PROCESSING' | 'ESCROWED' | 'RELEASED'): State of consumer payment.
  - `gigStatus` ('PENDING' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED'): Gig workflow state.
- [ ] Integrate Zustand middleware for session storage persistence (`persist`) for `selectedWorker` and `gigStatus` so that page reloads do not break ongoing bookings.

### [ ] Task 1.3: Build the Household Client Portal Components
- [ ] **`<ServiceDiscovery />`**: The landing view with a search bar and geolocation prompt.
- [ ] Create a custom hook `useLocationHook` that prompts the browser for high-accuracy latitude/longitude and updates `clientLocation` in the Zustand store.
- [ ] **`<CategoryGrid />`**: Standard responsive grid rendering icons for cooperative trade services.
- [ ] **`<WorkerSelection />` & `<CoopWorkerCard />`**:
  - Render search results sorted by proximity and community ratings.
  - The card must explicitly display the worker's name, hourly/fixed rate, specific Primary Cooperative Node, and overall community/Gram Panchayat rating.
- [ ] **`<BookingCheckout />` & `<PricingSummary />`**:
  - Provide a pricing matrix calculating base fare, platform convenience fee, and taxes.
- [ ] **`<EscrowPaymentGateway />`**:
  - Integrate a mocked payment checkout modal (Razorpay-style) that, upon successful completion, updates `escrowStatus` to `ESCROWED` and initiates the gig matching request.

### [ ] Task 1.4: Build the Active Gig Tracking and Payout Components
- [ ] **`<StatusTimeline />`**: A visual step-by-step progress tracking timeline updating in real-time as `gigStatus` changes.
- [ ] **`<SecureChat />`**: A simple UI for real-time WebSocket communication between client and worker, ensuring personal phone numbers remain private.
- [ ] **`<RatingAndRelease />` & `<CompletionApproval />`**:
  - Once the gig status transitions to `COMPLETED`, provide a numeric/OTP verification modal.
  - Add the "Approve and Release Funds" button that fires the API to release the escrowed payout.
- [ ] **`<ReviewForm />`**: Capture user rating and feedback text that influences the worker's rating within the cooperative network.

### [ ] Task 1.5: Build the Gig Worker Portal Portal Components
- [ ] **`<OnboardingKYC />`**: A multi-step forms wizard to upload documents (Aadhaar Card, Trade/Skill Certifications) and select a local Cooperative Node for membership association.
- [ ] **`<GigFeed />`**: A feed displaying nearby open gigs matching the worker's verified skills, updated via polling or WebSockets.
- [ ] **`<ExecutionMode />`**: A simplified execution panel featuring prominent, high-contrast, easily tappable action buttons for physical fieldwork:
  - `[Accept]` -> `[Arrived]` -> `[Start Job]` -> `[Complete Job]` (which prompts the client for OTP entry).
- [ ] **`<EarningsDashboard />`**: Detailed screens showing current wallet balance, historical daily payouts, and accrued cooperative shares/dividends.

### [ ] Task 1.6: Build the Cooperative Admin Federation Dashboard
- [ ] **`<SocietyManager />`**: A hierarchical view mapping state-level federations down to district nodes, individual local societies, and individual gig workers.
- [ ] **`<DividendLedger />`**: Transparency interface tracking overall platform fees collected, community reserve funds, and the distribution of surplus dividends back to cooperative members.
- [ ] **`<DemandHeatmap />`**: Integrating geographic map layers (using Leaflet or Google Maps) to display real-time and predicted high-demand areas.

---

## Phase 2: Flask Backend & PostGIS Integration
*Focus: Develop a high-performance Python backend leveraging PostgreSQL with the PostGIS extension to handle geospatial worker queries, user management, and AI demand forecasting.*

### [ ] Task 2.1: Initialize PostgreSQL & PostGIS Spatial Schema
- [ ] Initialize PostgreSQL and activate the spatial extension:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS postgis;
  ```
- [ ] Create the **`Users`** Table:
  - `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  - `phone_number` VARCHAR(15) UNIQUE NOT NULL
  - `role` VARCHAR(20) NOT NULL CHECK (role IN ('CONSUMER', 'WORKER', 'ADMIN'))
  - `wallet_balance` DECIMAL(12, 2) DEFAULT 0.00
  - `kyc_status` VARCHAR(20) DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED'))
  - `full_name` VARCHAR(100) NOT NULL
  - `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [ ] Create the **`Worker_Profiles`** Table with spatial attributes:
  - `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  - `user_id` UUID UNIQUE REFERENCES Users(id) ON DELETE CASCADE
  - `skills` TEXT[] -- Array of mapped skills (e.g., ['plumbing', 'sanitation'])
  - `location` GEOGRAPHY(Point, 4326) NOT NULL -- Spatial coordinate (Long/Lat)
  - `service_radius_km` INT DEFAULT 10 NOT NULL -- Coverage limit
  - `rating` DECIMAL(3, 2) DEFAULT 5.00
  - `coop_shares` INT DEFAULT 0
- [ ] Create the **`Gigs`** Table:
  - `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
  - `consumer_id` UUID REFERENCES Users(id)
  - `worker_id` UUID REFERENCES Users(id) NULLABLE
  - `job_location` GEOGRAPHY(Point, 4326) NOT NULL
  - `status` VARCHAR(20) DEFAULT 'SEARCHING' CHECK (status IN ('SEARCHING', 'ACCEPTED', 'COMPLETED', 'DISPUTED'))
  - `escrow_amount` DECIMAL(10, 2) NOT NULL
  - `coop_commission` DECIMAL(10, 2) NOT NULL
  - `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- [ ] Create spatial GIST indexes to optimize O(log N) nearest-neighbor calculations:
  ```sql
  CREATE INDEX idx_worker_location ON Worker_Profiles USING gist(location);
  CREATE INDEX idx_gig_job_location ON Gigs USING gist(job_location);
  ```

### [ ] Task 2.2: Setup Flask Core API Architecture
- [ ] Create a Python 3.12 environment with a robust project layout using Flask, SQLAlchemy, GeoAlchemy2, and PyJWT.
- [ ] Implement a global database connection layer in `app/__init__.py` using Flask-SQLAlchemy and Flask-Migrate.
- [ ] Implement JWT-based secure authentication routes (`/api/auth/register`, `/api/auth/login`) with middleware validating request headers for API calls.

### [ ] Task 2.3: Build the PostGIS-Enabled Spatial Match Engine
- [ ] Implement the core matching endpoint `/api/matching/find-workers` (POST):
  - Receive the consumer’s latitude and longitude, service category, and search radius.
  - Implement a raw or ORM-based GeoAlchemy2 spatial query using `ST_DWithin` and `ST_Distance` to retrieve active, verified workers within their service radius, sorted by shortest distance.
  - Python SQLAlchemy/PostGIS spatial query reference:
    ```python
    from app.models.profile import WorkerProfile
    from geoalchemy2 import Geometry
    from geoalchemy2.functions import ST_Distance, ST_DWithin
    from sqlalchemy import func

    # Query matching workers
    point = func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)
    workers = db.session.query(
        WorkerProfile,
        ST_Distance(WorkerProfile.location, point).label('distance')
    ).filter(
        ST_DWithin(WorkerProfile.location, point, radius_meters),
        WorkerProfile.skills.any(category_name)
    ).order_by('distance').all()
    ```

### [ ] Task 2.4: Build the AI Demand Forecasting Service
- [ ] Create a dedicated analytics service module `app/services/forecasting.py`.
- [ ] Implement a predictive model using `scikit-learn` or `statsmodels` (Prophet/ARIMA) to evaluate historical gig completion data.
- [ ] Create the predictive Flask endpoint `/api/admin/demand-forecast` (GET):
  - Take input coordinates and target date parameters.
  - Process historic seasonal variables, local festivals, and weather to return predicted demand surges (e.g., a 40% hike in AC maintenance bookings leading up to summer months).
  - Return JSON schemas containing coordinates and forecast metrics to paint the admin dashboard’s Demand Heatmap.

---

## Phase 3: Bhashini Integration & Cash Liability Logic
*Focus: Bridge digital literacy gaps using the voice-first Bhashini NLP translation mission and implement automated smart payment split/escrow ledgers for absolute transparency.*

### [ ] Task 3.1: Integrate Bhashini NLP Translation Middleware
- [ ] Create a translation helper class `app/services/bhashini_nlp.py` to communicate with the Bhashini (MeitY) ULCA API endpoint.
- [ ] Configure authorization headers containing the required MeitY client variables (`userID`, `ulcaApiKey`, and service IDs).
- [ ] Develop the standard **Neural Machine Translation (NMT)** payload handler to convert local dialect messages to English for database execution:
  - **Endpoint**: `/api/bhashini/translate` (POST)
  - **Request Body JSON**:
    ```json
    {
      "pipelineTasks": [
        {
          "taskType": "translation",
          "config": {
            "language": {
              "sourceLanguage": "hi",
              "targetLanguage": "en"
            }
          }
        }
      ],
      "inputData": {
        "input": [
          { "source": "मुझे कल सुबह एक इलेक्ट्रिशियन की आवश्यकता है" }
        ]
      }
    }
    ```
- [ ] Develop the **Automatic Speech Recognition (ASR)** endpoint wrapper `/api/bhashini/voice-to-text` (POST) to ingest binary speech bytes (via worker mic inputs) and return the converted vernacular string.
- [ ] Develop the **Text-to-Speech (TTS)** endpoint wrapper `/api/bhashini/text-to-speech` (POST) to synthesize backend task alerts (e.g., "New plumbing gig registered") into regional voice clips (e.g., Hindi, Marathi, Tamil) and return a playable audio file URL or base64 stream.

### [ ] Task 3.2: Implement Smart Escrow and Automated Split Settlement Logic
- [ ] Establish the **Escrow & Commission Split** database table:
  - **`Escrow_Ledger`**:
    - `id` UUID PRIMARY KEY
    - `gig_id` UUID REFERENCES Gigs(id)
    - `total_amount` DECIMAL(12,2)
    - `worker_cut` DECIMAL(12,2) -- ~95%
    - `coop_cut` DECIMAL(12,2) -- ~5% (platform operational fee, community reserves)
    - `status` CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED'))
- [ ] Implement the lock endpoint `/api/payments/lock-escrow` (POST):
  - Executed when a client books a worker. Captures the payment via UPI, locks funds in the `Escrow_Ledger` setting status to `HELD`, and updates the Zustand state to `ESCROWED`.
- [ ] Implement the secure completion and release endpoint `/api/payments/release-payout` (POST):
  - Triggered only upon a verified OTP exchange between client and worker, verifying physical gig completion.
  - **The Payout Split Algorithm**:
    - Fetch the locked amount from `Escrow_Ledger`.
    - Apply the cooperative split formulas:
      - Transfer **95%** directly to the worker’s digital wallet (`wallet_balance` field in `Users`).
      - Allocate the remaining **5%** platform fee to the cooperative reserve fund.
    - Update `Escrow_Ledger.status` to `RELEASED`.
    - Update Zustand `escrowStatus` to `RELEASED` and `gigStatus` to `COMPLETED`.
    - Record the transaction in an audit table for full administrative transparency.

---

## Verification & Deployment Guidelines
- [ ] Ensure all API endpoints handle database connection timeouts and implement standardized JSON error responses.
- [ ] Compile and verify the React application structure (`npm run build`).
- [ ] Validate Docker setup by running `docker-compose up --build` to confirm DB, Flask, and React run in isolated, connected containers.
