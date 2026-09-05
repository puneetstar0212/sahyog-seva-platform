# Cooperative Gig Platform

A platform designed to connect clients with workers for various gigs and services. 

## Architecture
- **Frontend**: React + Vite application (located in the `frontend/` directory).
- **Backend**: Flask API (handles endpoints like `/api/gigs`).

## Getting Started

### Frontend
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

### Environment Variables
Ensure you have an `.env` file in the `frontend` folder with the necessary variables (e.g., `VITE_API_BASE_URL=http://127.0.0.1:5000`).

## Features
- Client Dashboard: Post gigs, manage bookings, and track progress.
- Worker Feed: Browse open gigs, accept jobs, and manage your earnings.
- Progressive Web App (PWA) ready architecture.
