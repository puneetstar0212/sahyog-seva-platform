export type Portal = 'client' | 'worker' | 'admin';

export type Screen =
  | 'home'
  | 'services'
  | 'serviceDetail'
  | 'workers'
  | 'workerProfile'
  | 'checkout'
  | 'payment'
  | 'tracking'
  | 'chat'
  | 'review'
  | 'bookings'
  | 'dashboard'
  // Worker
  | 'workerOnboarding'
  | 'workerKyc'
  | 'workerSkills'
  | 'workerDashboard'
  | 'gigFeed'
  | 'gigDetail'
  | 'executionMode'
  | 'earnings'
  // Admin
  | 'adminDashboard'
  | 'societyManager'
  | 'dividendLedger'
  | 'demandHeatmap'
  | 'manageCustomers'
  | 'manageWorkers'
  // Auth
  | 'login'
  | 'register'
  // Dev / Testing
  | 'supabaseTest';

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'travelling'
  | 'arrived'
  | 'working'
  | 'awaiting_otp'
  | 'completed'
  | 'cancelled'
  | 'released';

export type WorkerStatus = 'online' | 'offline' | 'busy';

export interface Service {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  basePrice: number;
  unit: 'hour' | 'visit' | 'day' | 'sqft';
  image: string;
  tags: string[];
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  rating: number;
  totalJobs: number;
  experience: string;
  distance: string;
  availability: string;
  availableToday: boolean;
  image: string;
  society: string;
  skills: string[];
  bio: string;
  pricePerHour: number;
  verified: boolean;
  status: WorkerStatus;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  workerId: string;
  workerName: string;
  workerImage: string;
  clientId: string;
  clientName: string;
  clientImage: string;
  date: string;
  time: string;
  address: string;
  price: number;
  status: BookingStatus;
  otp: string;
  createdAt: string;
  gig_id?: string;        // optional link to a gig UUID
  rating?: number;
  reviewText?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  sender: 'client' | 'worker';
  text: string;
  timestamp: string;
}

export interface Gig {
  id: string;
  serviceId: string;
  serviceName?: string;
  title?: string;
  clientId: string;
  consumer_id?: string;
  clientName: string;
  clientImage: string;
  address: string;
  date: string;
  time: string;
  price: number;
  budget?: number;
  total_amount?: number;
  duration: string;
  status: 'open' | 'assigned' | 'completed' | 'SEARCHING' | 'ASSIGNED' | 'COMPLETED';
  description: string;
  distance: string;
}

export interface KycStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Society {
  id: string;
  name: string;
  members: number;
  activeWorkers: number;
  totalEarnings: number;
  dividendPool: number;
  status: 'active' | 'pending' | 'review';
  location: string;
  established: string;
}

export interface DividendRecord {
  id: string;
  societyId: string;
  societyName: string;
  workerName: string;
  amount: number;
  date: string;
  quarter: string;
  status: 'paid' | 'pending';
}

export interface DemandCell {
  area: string;
  category: string;
  demand: number;
  supply: number;
  gap: number;
}
