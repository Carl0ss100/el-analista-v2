import { createBrowserClient } from '@supabase/ssr';

let _client = null;

export function createClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
        signUp: async () => ({ error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: new Error('Supabase not configured') }),
        resetPasswordForEmail: async () => ({ error: new Error('Supabase not configured') }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null }), order: () => ({ limit: async () => ({ data: [] }), data: [] }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null }) }) }) }),
        delete: () => ({ eq: () => ({}) }),
        upsert: () => ({}),
      }),
    };
  }
  _client = createBrowserClient(url, key);
  return _client;
}
