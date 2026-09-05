import { create } from 'zustand';
import type { Portal, Screen, Service, Worker, Booking, ChatMessage, Gig } from '@/types';
import type { Profile, WorkerProfile as WorkerProfileRow } from '@/lib/supabase';
import {
  services as allServices, workers as allWorkers, initialBookings, initialChatMessages, openGigs,
} from '@/data/mockData';
import { api } from '@/lib/api';

interface AppState {
  portal: Portal;
  screen: Screen;
  selectedService: Service | null;
  selectedWorker: Worker | null;
  selectedBooking: Booking | null;
  selectedGig: Gig | null;
  bookings: Booking[];
  chatMessages: ChatMessage[];
  gigs: Gig[];
  workers: Worker[];
  services: Service[];
  otpInput: string;
  reviewRating: number;
  reviewText: string;
  kycCompletedSteps: string[];
  workerOnline: boolean;
  executionStep: 'travel' | 'arrived' | 'working' | 'awaiting_otp' | 'done';

  // API State
  isGigsLoading: boolean;
  gigsError: string | null;

  // Auth
  session: { user: { id: string; email: string } } | null;
  profile: Profile | null;
  workerProfile: WorkerProfileRow | null;
  authLoading: boolean;
  authError: string | null;
  authMode: 'login' | 'register';

  setSession: (session: { user: { id: string; email: string } } | null) => void;
  setProfile: (profile: Profile | null) => void;
  setWorkerProfile: (wp: WorkerProfileRow | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  signOutAndReset: () => void;

  setPortal: (portal: Portal) => void;
  navigate: (screen: Screen) => void;
  selectService: (service: Service) => void;
  selectWorker: (worker: Worker) => void;
  selectBooking: (booking: Booking) => void;
  selectGig: (gig: Gig) => void;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'otp' | 'status'>) => string;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  sendMessage: (bookingId: string, sender: 'client' | 'worker', text: string) => void;
  setOtpInput: (value: string) => void;
  setReviewRating: (value: number) => void;
  setReviewText: (value: string) => void;
  submitReview: (bookingId: string) => void;
  acceptGig: (gigId: string, workerId: string) => void;
  completeKycStep: (stepId: string) => void;
  setWorkerOnline: (online: boolean) => void;
  setExecutionStep: (step: 'travel' | 'arrived' | 'working' | 'awaiting_otp' | 'done') => void;
  releasePayment: (bookingId: string) => void;

  // API Actions
  fetchGigs: () => Promise<void>;
  createNewGig: (gigData: Partial<Gig>) => Promise<void>;
}

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useAppStore = create<AppState>((set, get) => ({
  portal: 'client',
  screen: 'home',
  selectedService: null,
  selectedWorker: null,
  selectedBooking: null,
  selectedGig: null,
  bookings: initialBookings,
  chatMessages: initialChatMessages,
  gigs: openGigs,
  workers: allWorkers,
  services: allServices,
  otpInput: '',
  reviewRating: 0,
  reviewText: '',
  kycCompletedSteps: [],
  workerOnline: false,
  executionStep: 'travel',

  isGigsLoading: false,
  gigsError: null,

  session: null,
  profile: null,
  workerProfile: null,
  authLoading: false,
  authError: null,
  authMode: 'login',

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setWorkerProfile: (wp) => set({ workerProfile: wp }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setAuthError: (error) => set({ authError: error }),
  setAuthMode: (mode) => set({ authMode: mode }),
  signOutAndReset: () => set({ session: null, profile: null, workerProfile: null, portal: 'client', screen: 'home' }),

  setPortal: (portal) => set({ portal, screen: portal === 'client' ? 'home' : portal === 'worker' ? 'workerDashboard' : 'adminDashboard' }),

  navigate: (screen) => {
    set({ screen });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  selectService: (service) => set({ selectedService: service }),
  selectWorker: (worker) => set({ selectedWorker: worker }),
  selectBooking: (booking) => set({ selectedBooking: booking, otpInput: '', reviewRating: booking.rating ?? 0, reviewText: booking.reviewText ?? '' }),
  selectGig: (gig) => set({ selectedGig: gig }),

  createBooking: (booking) => {
    const id = 'b' + generateId();
    const otp = generateOtp();
    const newBooking: Booking = { ...booking, id, status: 'pending', otp, createdAt: new Date().toISOString() };
    set((state) => ({ bookings: [newBooking, ...state.bookings], selectedBooking: newBooking }));
    return id;
  },

  updateBookingStatus: (id, status) => set((state) => ({
    bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
    selectedBooking: state.selectedBooking?.id === id ? { ...state.selectedBooking, status } : state.selectedBooking,
  })),

  sendMessage: (bookingId, sender, text) => set((state) => ({
    chatMessages: [...state.chatMessages, { id: 'm' + generateId(), bookingId, sender, text, timestamp: new Date().toISOString() }],
  })),

  setOtpInput: (value) => set({ otpInput: value }),
  setReviewRating: (value) => set({ reviewRating: value }),
  setReviewText: (value) => set({ reviewText: value }),

  submitReview: (bookingId) => set((state) => ({
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, rating: state.reviewRating, reviewText: state.reviewText } : b)),
  })),

  acceptGig: (gigId, workerId) => set((state) => ({
    gigs: state.gigs.map((g) => (g.id === gigId ? { ...g, status: 'assigned' } : g)),
  })),

  completeKycStep: (stepId) => set((state) => ({
    kycCompletedSteps: state.kycCompletedSteps.includes(stepId) ? state.kycCompletedSteps : [...state.kycCompletedSteps, stepId],
  })),

  setWorkerOnline: (online) => set({ workerOnline: online }),
  setExecutionStep: (step) => set({ executionStep: step }),

  releasePayment: (bookingId) => set((state) => ({
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status: 'released' } : b)),
    selectedBooking: state.selectedBooking?.id === bookingId ? { ...state.selectedBooking, status: 'released' } : state.selectedBooking,
  })),

  fetchGigs: async () => {
    set({ isGigsLoading: true, gigsError: null });
    try {
      const fetchedGigs = await api.gigs.get();
      set({ gigs: fetchedGigs, isGigsLoading: false });
    } catch (error: any) {
      set({ gigsError: error.message || 'Failed to load gigs', isGigsLoading: false });
    }
  },

  createNewGig: async (gigData) => {
    try {
      // Optimistic update could go here, or we wait for API response
      const newGig = await api.gigs.post(gigData);
      set((state) => ({ gigs: [newGig, ...state.gigs] }));
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create gig');
    }
  },
}));
