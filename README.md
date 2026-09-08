# Sahyog Seva Platform

Sahyog Seva is a cooperative gig economy platform designed to connect clients with skilled workers fairly and transparently. It is built on a "cooperative first" economic model that guarantees workers receive 95% of their gross earnings, while a 5% contribution is directed to a cooperative/welfare fund to provide benefits, training, and community support.

## Key Features

### Cooperative Economic Model
- **95/5 Split:** Workers keep exactly 95% of the booking value. The remaining 5% is allocated to a cooperative/welfare fund, replacing predatory commission structures typical in the gig economy.
- **Transparent Ledgers:** Both workers and administrators have real-time visibility into exact payout values and cooperative contributions.
- **Escrow & Security:** Payments are held securely in escrow and only released to the worker when the job is completed and the client verifies it using a one-time password (OTP).

### Multi-Role Portals
- **Client Portal:** Clients can browse services, get AI-driven price estimates, create gigs, pay securely, track worker progress in real-time, and verify job completion via OTP.
- **Worker Portal:** Workers can view nearby gigs, accept jobs, execute an integrated step-by-step workflow (traveling, arrived, working, complete), and track their earnings instantly.
- **Admin Portal:** Administrators can manage the 5% cooperative dividend ledger, track overall platform demand via a Heatmap, and analyze dynamic pricing trends.

### AI Integration
- **Dynamic Pricing Engine:** AI-powered estimates based on gig description, location, urgency, and current market demand.
- **Support Chatbot:** Integrated GenAI chatbot to assist users with platform questions, booking issues, and general support.
- **Demand Forecasting (Planned):** Analyzing historical bookings to forecast demand gaps for strategic worker onboarding.

## Architecture

- **Frontend:** Built with React, TypeScript, and Vite. Uses Zustand for lightweight global state management and Lucide React for consistent iconography.
- **Backend:** Powered by a Python Flask API. Uses SQLAlchemy for database interactions (PostgreSQL).
- **Database:** PostgreSQL (with PostGIS support for geolocation capabilities).

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL

### Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies (make sure you have a `requirements.txt` or install Flask/SQLAlchemy directly):
   ```bash
   pip install -r requirements.txt
   ```
4. Setup environment variables by copying `.env.example` to `.env` and adding your database URL and API keys (Gemini API for AI features).
5. Run the backend server:
   ```bash
   python app.py
   ```
   The backend will typically start on `http://127.0.0.1:5000`.

### Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure you have an `.env` file in the `frontend` directory:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:5000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

## Contributing
Contributions are welcome to help improve the cooperative ecosystem! Please read the contribution guidelines and submit PRs to the `main` branch.

## License
This project is licensed under the MIT License.
