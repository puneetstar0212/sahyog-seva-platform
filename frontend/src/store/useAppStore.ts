import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Portal, Screen, Service, Worker, Booking, ChatMessage, Gig } from '@/types';
import type { Profile, WorkerProfile as WorkerProfileRow } from '@/lib/supabase';
import { services as allServices } from '@/data/mockData';
import { api } from '@/lib/api';
import type { CreateBookingPayload } from '@/lib/api';

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

  // API State — Gigs & Workers
  isGigsLoading: boolean;
  gigsError: string | null;
  isWorkersLoading: boolean;
  workersError: string | null;

  // Booking async state
  isBookingSubmitting: boolean;   // true while createBooking POST is in flight → prevents double-click
  isBookingLoading: boolean;      // true while a status update is in flight
  bookingError: string | null;    // last booking-related error message

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
  adminLogout: () => Promise<void>;

  setPortal: (portal: Portal) => void;
  navigate: (screen: Screen) => void;
  selectService: (service: Service) => void;
  selectWorker: (worker: Worker) => void;
  selectBooking: (booking: Booking) => void;
  selectGig: (gig: Gig) => void;

  /**
   * Creates a booking via the backend API (persisted to Supabase).
   * Returns the real database UUID so the UI can link to it immediately.
   * Sets isBookingSubmitting=true while in flight to prevent double-click.
   */
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'otp' | 'status'>) => Promise<string>;

  /**
   * Persists a status change to the backend, then syncs Zustand state.
   */
  updateBookingStatus: (id: string, status: Booking['status']) => Promise<void>;

  sendMessage: (bookingId: string, sender: 'client' | 'worker', text: string) => void;
  setOtpInput: (value: string) => void;
  setReviewRating: (value: number) => void;
  setReviewText: (value: string) => void;
  submitReview: (bookingId: string) => void;
  acceptGig: (gigId: string) => Promise<void>;
  completeKycStep: (stepId: string) => void;
  setWorkerOnline: (online: boolean) => void;
  setExecutionStep: (step: 'travel' | 'arrived' | 'working' | 'awaiting_otp' | 'done') => void;

  /**
   * Verifies the OTP on the backend. If successful, backend sets status to 'completed'
   * and triggers escrow release.
   */
  verifyOtp: (bookingId: string, otp: string) => Promise<void>;

  // API Actions
  fetchGigs: () => Promise<void>;
  fetchWorkers: () => Promise<void>;
  createNewGig: (gigData: Partial<Gig>) => Promise<void>;
  /** Loads bookings for the logged-in user from the backend into Zustand. */
  fetchUserBookings: () => Promise<void>;

  workerEarnings: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    pendingPayout: number;
    jobsCompleted: number;
    averageRating: number;
    hourlyRate: number;
    monthlyHistory: { month: string; amount: number }[];
  } | null;
  fetchWorkerEarnings: (workerId: string) => Promise<void>;
}

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Maps a raw DB booking row onto the frontend Booking shape. */
function rowToBooking(row: Record<string, unknown>, overlay: Partial<Booking>): Booking {
  return {
    id: String(row.id),
    serviceId: String(row.service_id ?? overlay.serviceId ?? ''),
    serviceName: overlay.serviceName ?? '',
    workerId: String(row.worker_id ?? overlay.workerId ?? ''),
    workerName: overlay.workerName ?? '',
    workerImage: overlay.workerImage ?? '',
    clientId: String(row.customer_id ?? overlay.clientId ?? 'demo'),
    clientName: overlay.clientName ?? '',
    clientImage: overlay.clientImage ?? '',
    date: String(row.date),
    time: String(row.time),
    address: String(row.address),
    price: Number(row.price),
    status: (row.status as Booking['status']) ?? 'pending',
    otp: String(row.otp ?? '0000'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    gig_id: row.gig_id ? String(row.gig_id) : undefined,
    escrowResult: row.escrowResult as { worker_payout: number; coop_commission: number } | undefined,
  };
}


export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      portal: 'client',
  screen: 'home',
  selectedService: null,
  selectedWorker: null,
  selectedBooking: null,
  selectedGig: null,
  bookings: [],
  chatMessages: [],
  gigs: [],
  workers: [],
  services: allServices,
  otpInput: '',
  reviewRating: 0,
  reviewText: '',
  kycCompletedSteps: [],
  workerOnline: false,
  executionStep: 'travel',

  isGigsLoading: false,
  gigsError: null,
  isWorkersLoading: false,
  workersError: null,

  isBookingSubmitting: false,
  isBookingLoading: false,
  bookingError: null,

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
  adminLogout: async () => {
    try {
      // Intentionally call supabase signOut to clear session
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Failed to log out of supabase', e);
    }
    set({ session: null, profile: null, workerProfile: null, portal: 'admin', screen: 'adminDashboard' });
  },

  setPortal: (portal) => set({ portal, screen: portal === 'client' ? 'home' : portal === 'worker' ? 'workerDashboard' : 'adminDashboard' }),

  navigate: (screen) => {
    set({ screen });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  selectService: (service) => set({ selectedService: service }),
  selectWorker: (worker) => set({ selectedWorker: worker }),
  selectBooking: (booking) => set({ selectedBooking: booking, otpInput: '', reviewRating: booking.rating ?? 0, reviewText: booking.reviewText ?? '' }),
  selectGig: (gig) => set({ selectedGig: gig }),

  // ─── BOOKING CREATION ──────────────────────────────────────────────────────
  createBooking: async (bookingData) => {
    // Guard against double-click / concurrent submissions
    if (get().isBookingSubmitting) {
      return get().selectedBooking?.id ?? '';
    }

    set({ isBookingSubmitting: true, bookingError: null });

    const { session } = get();
    const customerId = session?.user.id ?? bookingData.clientId;

    // ── Optimistic local update ──────────────────────────────────────────────
    const tempId = 'pending-' + generateId();
    const optimisticBooking: Booking = {
      ...bookingData,
      id: tempId,
      status: 'pending',
      otp: '', // Backend will generate the actual OTP
      createdAt: new Date().toISOString(),
      clientId: customerId,
    };
    set((state) => ({
      bookings: [optimisticBooking, ...state.bookings],
      selectedBooking: optimisticBooking,
    }));

    // ── Persist to backend ────────────────────────────────────────────────────
    try {
      const payload: CreateBookingPayload = {
        customer_id: customerId,
        worker_id: bookingData.workerId,
        service_id: bookingData.serviceId,
        gig_id: bookingData.gig_id,
        date: bookingData.date,
        time: bookingData.time,
        address: bookingData.address,
        price: bookingData.price,
        service_name: bookingData.serviceName,
      };

      const row = await api.bookings.create(payload);

      // Replace the temp booking with the real persisted one
      const persistedBooking = rowToBooking(row as unknown as Record<string, unknown>, bookingData);
      set((state) => ({
        bookings: state.bookings.map((b) => (b.id === tempId ? persistedBooking : b)),
        selectedBooking: persistedBooking,
        isBookingSubmitting: false,
      }));

      return persistedBooking.id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking';
      // Keep the optimistic booking in the list for demo continuity, but surface the error
      set({ isBookingSubmitting: false, bookingError: msg });
      // Return the temp id so navigation still works (demo graceful fallback)
      return tempId;
    }
  },

  // ─── STATUS UPDATE ─────────────────────────────────────────────────────────
  updateBookingStatus: async (id, status) => {
    // Optimistic update immediately
    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
      selectedBooking: state.selectedBooking?.id === id
        ? { ...state.selectedBooking, status }
        : state.selectedBooking,
      isBookingLoading: true,
      bookingError: null,
    }));

    // Skip backend for temp/demo IDs that haven't been persisted
    if (id.startsWith('pending-') || id.startsWith('b') && id.length < 12) {
      set({ isBookingLoading: false });
      return;
    }

    try {
      await api.bookings.updateStatus(id, status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update booking status';
      set({ bookingError: msg });
    } finally {
      set({ isBookingLoading: false });
    }
  },

  // ─── OTP VERIFICATION ──────────────────────────────────────────────────────
  verifyOtp: async (bookingId, otp) => {
    set({ isBookingLoading: true, bookingError: null });
    
    // Skip backend for temp/demo IDs that haven't been persisted
    if (bookingId.startsWith('pending-') || (bookingId.startsWith('b') && bookingId.length < 12)) {
      // Simulate success for local demo bookings
      set((state) => ({
        bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b)),
        selectedBooking: state.selectedBooking?.id === bookingId
          ? { ...state.selectedBooking, status: 'completed' }
          : state.selectedBooking,
        isBookingLoading: false,
      }));
      return;
    }

    try {
      const updatedRow = await api.bookings.verifyOtp(bookingId, otp);
      const updatedBooking = rowToBooking(updatedRow as Record<string, unknown>, get().selectedBooking || {});
      set((state) => ({
        bookings: state.bookings.map((b) => (b.id === bookingId ? updatedBooking : b)),
        selectedBooking: state.selectedBooking?.id === bookingId ? updatedBooking : state.selectedBooking,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify OTP';
      set({ bookingError: msg });
      throw new Error(msg); // re-throw so UI can handle (e.g. show toast)
    } finally {
      set({ isBookingLoading: false });
    }
  },

  sendMessage: (bookingId, sender, text) => set((state) => ({
    chatMessages: [...state.chatMessages, { id: 'm' + generateId(), bookingId, sender, text, timestamp: new Date().toISOString() }],
  })),

  setOtpInput: (value) => set({ otpInput: value }),
  setReviewRating: (value) => set({ reviewRating: value }),
  setReviewText: (value) => set({ reviewText: value }),

  submitReview: (bookingId) => set((state) => ({
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, rating: state.reviewRating, reviewText: state.reviewText } : b)),
  })),

  acceptGig: async (gigId) => {
    // Optimistic local update
    set((state) => ({
      gigs: state.gigs.map((g) => (g.id === gigId ? { ...g, status: 'ASSIGNED' } : g)),
    }));

    try {
      const { session } = get();
      const workerId = session?.user?.id;
      if (!workerId) throw new Error('You must be logged in as a worker to accept gigs');
      // Backend handles setting the assigned_worker_id and status=ASSIGNED
      const updatedGig = await api.gigs.accept(gigId, workerId);
      
      // Update local state with persisted row
      set((state) => ({
        gigs: state.gigs.map((g) => (g.id === gigId ? { ...g, ...updatedGig, status: 'ASSIGNED' } : g)),
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept gig';
      // Revert optimistic update and set error
      set((state) => ({
        gigs: state.gigs.map((g) => (g.id === gigId ? { ...g, status: 'SEARCHING' } : g)),
        gigsError: msg
      }));
      throw err; // allow UI to catch and show toast
    }
  },

  completeKycStep: (stepId) => set((state) => ({
    kycCompletedSteps: state.kycCompletedSteps.includes(stepId) ? state.kycCompletedSteps : [...state.kycCompletedSteps, stepId],
  })),

  setWorkerOnline: (online) => set({ workerOnline: online }),
  setExecutionStep: (step) => set({ executionStep: step }),

  // ─── FETCH USER BOOKINGS ───────────────────────────────────────────────────
  fetchUserBookings: async () => {
    const { session } = get();
    if (!session?.user.id) return;

    set({ isBookingLoading: true, bookingError: null });
    try {
      const rows = await api.bookings.list({ customer_id: session.user.id });
      if (rows.length > 0) {
        const fetchedBookings: Booking[] = rows.map((row) =>
          rowToBooking(row as unknown as Record<string, unknown>, {})
        );
        // Merge: keep mock bookings, prepend real ones
        set((state) => {
          const newBookings = [
            ...fetchedBookings,
            ...state.bookings.filter((b) => b.clientId === 'c1'), // keep mock demo bookings
          ];
          
          // Sync selectedBooking if it's currently active
          let newSelectedBooking = state.selectedBooking;
          if (newSelectedBooking) {
            const updated = fetchedBookings.find(b => b.id === newSelectedBooking!.id);
            if (updated) {
              newSelectedBooking = { ...newSelectedBooking, ...updated };
            }
          }

          return {
            bookings: newBookings,
            selectedBooking: newSelectedBooking,
          };
        });
      }
    } catch {
      // Silently fail — mock bookings remain visible
    } finally {
      set({ isBookingLoading: false });
    }
  },

  // ─── GIGS & WORKERS ────────────────────────────────────────────────────────
  fetchGigs: async () => {
    set({ isGigsLoading: true, gigsError: null });
    try {
      const fetchedGigs = await api.gigs.get();
      set({ gigs: fetchedGigs, isGigsLoading: false });
    } catch (error: unknown) {
      set({ gigsError: error instanceof Error ? error.message : 'Failed to load gigs', isGigsLoading: false });
    }
  },

  fetchWorkers: async () => {
    set({ isWorkersLoading: true, workersError: null });
    try {
      const data = await api.workers.getApproved();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedWorkers = data.map((wp: any) => {
          const profile = wp.profile || {};
          const skills = Array.isArray(wp.skills) ? wp.skills : [];
          const name = profile.full_name || 'Unknown Worker';
          // Find first skill that maps to a role, or use default
          const primaryRole = skills.length > 0 ? skills[0] : 'Worker';
          
          return {
            id: String(wp.user_id),
            name: name,
            role: primaryRole,
            rating: 4.8,
            totalJobs: wp.experience_years ? Number(wp.experience_years) * 10 : 50,
            experience: `${wp.experience_years ?? 5} years exp`,
            distance: 'Nearby',
            availability: 'Flexible',
            availableToday: true,
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            society: profile.address || 'Bharat Co-op',
            skills: skills,
            bio: wp.admin_notes || 'Verified cooperative worker.',
            pricePerHour: Number(wp.hourly_rate ?? 200),
            verified: wp.approval_status === 'approved',
            status: 'online' as const,
          };
        });

        set({ workers: mappedWorkers, isWorkersLoading: false });
      }
    } catch (error: unknown) {
      set({ workersError: error instanceof Error ? error.message : 'Failed to load workers', isWorkersLoading: false });
    }
  },

  createNewGig: async (gigData) => {
    try {
      const newGig = await api.gigs.post(gigData);
      set((state) => ({ gigs: [newGig, ...state.gigs] }));
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create gig');
    }
  },

  fetchWorkerEarnings: async (workerId: string) => {
    try {
      const earnings = await api.workers.getEarnings(workerId);
      set({ workerEarnings: earnings });
    } catch (error) {
      console.error('Failed to load worker earnings:', error);
      // Fallback state if backend is down or no data
      set({
        workerEarnings: {
          total: 0,
          thisMonth: 0,
          thisWeek: 0,
          pendingPayout: 0,
          jobsCompleted: 0,
          averageRating: 0,
          hourlyRate: 0,
          monthlyHistory: []
        }
      });
    }
  },
    }),
    {
      name: 'sahyog-store',
      partialize: (state) => ({
        portal: state.portal,
        screen: state.screen,
        selectedService: state.selectedService,
        selectedWorker: state.selectedWorker,
        selectedBooking: state.selectedBooking,
        selectedGig: state.selectedGig,
        bookings: state.bookings,
        session: state.session,
        profile: state.profile,
        workerProfile: state.workerProfile,
      }),
    }
  )
);

