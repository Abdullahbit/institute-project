import { env } from '../env';
import { supabase } from '../lib/supabaseClient';

export function getSchoolSlugFromHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.host; 
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');
  
  if (parts.length > 2) {
    return parts[0];
  } else if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  
  return localStorage.getItem('x-school-slug');
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const slug = getSchoolSlugFromHostname();
  if (slug) {
    headers['x-school-slug'] = slug;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function trpcQuery<T = any>(
  procedure: string,
  input?: any
): Promise<T> {
  const headers = await getAuthHeaders();
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}/trpc/${procedure}`);
  if (input !== undefined) {
    url.searchParams.append('input', JSON.stringify(input));
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const json = await res.json();
  
  if (!res.ok) {
    const errMsg = json?.error?.message || json?.message || 'Procedure call failed';
    throw new Error(errMsg);
  }

  return json?.result?.data as T;
}

export async function trpcMutation<T = any>(
  procedure: string,
  input: any
): Promise<T> {
  const headers = await getAuthHeaders();
  const url = `${env.NEXT_PUBLIC_API_URL}/trpc/${procedure}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  const json = await res.json();

  if (!res.ok) {
    const errMsg = json?.error?.message || json?.message || 'Procedure call failed';
    throw new Error(errMsg);
  }

  return json?.result?.data as T;
}
