import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  role: 'customer' | 'worker' | 'admin';
  created_at?: string;
};

export type WorkerProfile = {
  id: string;
  user_id: string;
  skills: string[];
  experience_years: number;
  hourly_rate: number;
  working_hours: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
};
