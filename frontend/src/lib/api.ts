import type { Gig } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithHandler(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other fetch errors
    throw new Error(error instanceof Error ? error.message : 'Network error occurred');
  }
}

export const api = {
  gigs: {
    get: async (): Promise<Gig[]> => {
      return fetchWithHandler(`${API_BASE_URL}/api/gigs`);
    },
    post: async (gigData: Partial<Gig>): Promise<Gig> => {
      return fetchWithHandler(`${API_BASE_URL}/api/gigs`, {
        method: 'POST',
        body: JSON.stringify(gigData),
      });
    },
  },
};
