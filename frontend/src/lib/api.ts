import type { Gig } from '@/types';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithHandler<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(response.status, body?.error ?? `HTTP ${response.status}`);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error instanceof Error ? error.message : 'Network error occurred');
  }
}

// ─── Booking payload sent to the backend ──────────────────────────────────────
export interface CreateBookingPayload {
  customer_id?: string;
  worker_id?: string;
  service_id?: string;
  gig_id?: string;
  date: string;
  time: string;
  address: string;
  price: number;
  // Extra display fields stored in Zustand only (not in DB)
  serviceName?: string;
  workerName?: string;
  workerImage?: string;
  clientName?: string;
  clientImage?: string;
}

// ─── Raw DB row shape returned by backend ─────────────────────────────────────
export interface BookingRow {
  id: string;
  customer_id: string | null;
  worker_id: string | null;
  service_id: string | null;
  gig_id: string | null;
  date: string;
  time: string;
  address: string;
  price: number;
  status: string;
  otp: string;
  created_at: string;
  updated_at: string;
}

export const api = {
  gigs: {
    get: (): Promise<Gig[]> =>
      fetchWithHandler<Gig[]>(`${API_BASE_URL}/api/gigs`),

    post: (gigData: Partial<Gig>): Promise<Gig> =>
      fetchWithHandler<Gig>(`${API_BASE_URL}/api/gigs`, {
        method: 'POST',
        body: JSON.stringify(gigData),
      }),
      
    accept: (gigId: string, workerId?: string): Promise<Gig> =>
      fetchWithHandler<Gig>(`${API_BASE_URL}/api/gigs/${gigId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ worker_id: workerId }),
      }),
  },

  bookings: {
    /** POST /api/bookings — create and persist a booking; returns the DB row with real UUID + OTP */
    create: (payload: CreateBookingPayload): Promise<BookingRow> =>
      fetchWithHandler<BookingRow>(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /** GET /api/bookings/:id — fetch a single booking by UUID */
    get: (id: string): Promise<BookingRow> =>
      fetchWithHandler<BookingRow>(`${API_BASE_URL}/api/bookings/${id}`),

    /** GET /api/bookings?customer_id=x — list bookings for a customer */
    list: (params: { customer_id?: string; worker_id?: string; status?: string } = {}): Promise<BookingRow[]> => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
      ).toString();
      return fetchWithHandler<BookingRow[]>(`${API_BASE_URL}/api/bookings${qs ? `?${qs}` : ''}`);
    },

    /** PATCH /api/bookings/:id/status — update booking status */
    updateStatus: (id: string, status: string): Promise<BookingRow> =>
      fetchWithHandler<BookingRow>(`${API_BASE_URL}/api/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    /** POST /api/bookings/:id/verify-otp — verify OTP for a booking */
    verifyOtp: (id: string, otp: string): Promise<BookingRow> =>
      fetchWithHandler<BookingRow>(`${API_BASE_URL}/api/bookings/${id}/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ otp }),
      }),
  },

  workers: {
    getApproved: async () => {
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('*, profile:profiles(*)')
        .eq('approval_status', 'approved');
      
      if (error) throw error;
      return data;
    },
    getEarnings: (workerId: string): Promise<{
      total: number;
      thisMonth: number;
      thisWeek: number;
      pendingPayout: number;
      jobsCompleted: number;
    }> => fetchWithHandler(`${API_BASE_URL}/api/workers/${workerId}/earnings`),
  },

  payments: {
    lockEscrow: (payload: { gig_id: string; amount: number }): Promise<{
      id: number;
      gig_id: string;
      amount: number;
      status: string;
      worker_payout: number;
      coop_commission: number;
    }> =>
      fetchWithHandler(`${API_BASE_URL}/api/payments/lock-escrow`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  admin: {
    getCooperativeStats: (): Promise<{
      total_dividend_pool: number;
      total_revenue: number;
      payouts_made: number;
      status: string;
    }> => fetchWithHandler(`${API_BASE_URL}/api/admin/cooperative-stats`),

    listCooperativeTransactions: (): Promise<any[]> =>
      fetchWithHandler(`${API_BASE_URL}/api/admin/cooperative-transactions`),

    getDemandHeatmap: (params?: { from_date?: string; to_date?: string }): Promise<{
      cells: Array<{
        area: string;
        category: string;
        demand: number;
        supply: number;
        gap: number;
        status: string;
        booking_count: number;
        worker_count: number;
      }>;
      from_date: string;
      to_date: string;
      data_source: string;
      total_cells: number;
    }> => {
      const qs = params
        ? new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
          ).toString()
        : '';
      return fetchWithHandler(`${API_BASE_URL}/api/admin/demand-heatmap${qs ? `?${qs}` : ''}`);
    },
  },
};

