/**
 * Client Supabase (auth + database).
 *
 * Configurazione: aggiungi in `.env.local` (non committato):
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
 *
 * URL e anon key si trovano su Supabase → Project Settings → API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

const client: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

/** Ritorna il client Supabase o lancia un errore se non configurato. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error('Supabase non configurato: aggiungi URL e anon key in .env.local');
  }
  return client;
}
