import { createClient } from '@supabase/supabase-js';

let _supabase = null;
let _supabaseAdmin = null;

export function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

export function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

export function requireSupabase() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return client;
}
