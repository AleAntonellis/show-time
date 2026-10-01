import { getSupabase } from '@/services/supabase';

const regionByUser = new Map<string, string>();

async function getSessionUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session?.user) {
    throw new Error(error?.message ?? 'Sessione non valida');
  }
  return data.session.user.id;
}

function normalizeRegion(value: string): string {
  const region = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) {
    throw new Error('Paese non valido');
  }
  return region;
}

export async function getWatchRegion(forceRefresh = false): Promise<string> {
  const userId = await getSessionUserId();
  const cached = regionByUser.get(userId);
  if (!forceRefresh && cached) {
    return cached;
  }

  const { data, error } = await getSupabase().rpc('get_watch_region');
  if (error) {
    throw new Error(error.message);
  }
  const region = normalizeRegion(String(data));
  regionByUser.set(userId, region);
  return region;
}

export async function setWatchRegion(region: string): Promise<string> {
  const userId = await getSessionUserId();
  const normalized = normalizeRegion(region);
  const { data, error } = await getSupabase().rpc('set_watch_region', {
    p_region: normalized,
  });
  if (error) {
    throw new Error(error.message);
  }
  const saved = normalizeRegion(String(data));
  regionByUser.set(userId, saved);
  return saved;
}
