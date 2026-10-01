import { getSupabase } from '@/services/supabase';
import type { MediaType } from '@/services/tmdb';

export type FollowedTitleActivityEntry = {
  id: string;
  username: string;
  displayName: string | null;
  detail: string;
  watchedOn: string;
  rating: number | null;
  note: string | null;
  viewingNumber: number;
};

export type FollowedTitleActivityPage = {
  entries: FollowedTitleActivityEntry[];
  totalCount: number;
  contactCount: number;
  averageRating: number | null;
};

type ActivityRow = {
  username: string;
  display_name: string | null;
  detail: string;
  watched_on: string;
  rating: number | null;
  note: string | null;
  viewing_number: number;
  total_count: number;
  contact_count: number;
  average_rating: number | null;
};

export async function getFollowedTitleActivity(
  mediaType: MediaType,
  tmdbId: number,
  limit = 3,
  offset = 0,
): Promise<FollowedTitleActivityPage> {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new Error('Titolo non valido');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error('Limite attività non valido');
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Offset attività non valido');
  }

  const { data, error } = await getSupabase().rpc('get_followed_title_activity', {
    p_media_type: mediaType,
    p_tmdb_id: tmdbId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ActivityRow[];
  const first = rows[0];
  return {
    entries: rows.map((row, index) => ({
      id: `${row.username}-${row.detail}-${row.watched_on}-${offset + index}`,
      username: row.username,
      displayName: row.display_name,
      detail: row.detail,
      watchedOn: row.watched_on,
      rating: row.rating,
      note: row.note,
      viewingNumber: Number(row.viewing_number),
    })),
    totalCount: first ? Number(first.total_count) : 0,
    contactCount: first ? Number(first.contact_count) : 0,
    averageRating:
      first?.average_rating != null ? Number(first.average_rating) : null,
  };
}
