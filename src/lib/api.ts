import { supabase } from './supabase';

const CLOUDFLARE_WORKER_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gitfeed-backend.sriram.workers.dev';

interface FetchAPIOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Base fetch wrapper for the Cloudflare Workers API.
 * Automatically adds authorization headers using the current Supabase session.
 */
export async function fetchAPI<T = any>(
  path: string,
  options: FetchAPIOptions = {}
): Promise<T> {
  const { requireAuth = true, headers: customHeaders, ...restOptions } = options;
  const url = `${CLOUDFLARE_WORKER_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers = new Headers(customHeaders);
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    } else {
      throw new Error('Authentication required: No active session found.');
    }
  }

  const response = await fetch(url, {
    headers,
    ...restOptions,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP error! Status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

/**
 * Trigger background ingestion tasks from the admin client (admin dashboard or debug menu).
 */
export async function triggerPipelineSync(pipeline: 'trending' | 'news' | 'tweets' | 'releases' | 'keepalive') {
  return fetchAPI<{ message: string }>('/api/admin/trigger-ingest', {
    method: 'POST',
    body: JSON.stringify({ pipeline }),
  });
}

/**
 * Fetches authenticated user context from Cloudflare Worker.
 */
export async function getUserProfileAPI() {
  return fetchAPI<{ user: any }>('/api/user/profile');
}
