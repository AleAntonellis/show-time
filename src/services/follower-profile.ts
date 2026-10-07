import type { LibraryStatus } from '@/services/library';
import {
  isBadgeLevelKey,
  type BadgeLevelKey,
} from '@/services/badges';
import { normalizeUsername, usernameValidationError } from '@/services/social';
import { getSupabase } from '@/services/supabase';
import { posterUrl, type MediaType } from '@/services/tmdb';
import { sortProfileTrophies } from '@/utils/profile-trophies';

export type FollowedProfile = {
  username: string;
  displayName: string | null;
  libraryCount: number;
  diaryCount: number;
};

export type FollowedLibraryItem = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterUrl: string | null;
  status: LibraryStatus;
  totalEpisodes: number | null;
  watchedEpisodes: number;
};

export type FollowedDiaryEntry = {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterUrl: string | null;
  detail: string;
  watchedOn: string;
  rating: number | null;
  note: string | null;
};

export type FollowedProfileTrophy = {
  badgeId: string;
  badgeName: string;
  badgeDescription: string;
  level: number;
  levelKey: BadgeLevelKey;
  levelName: string;
  unlockedAt: string;
};

type ProfileRow = {
  username: string;
  display_name: string | null;
  library_count: number;
  diary_count: number;
};

type LibraryRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: string | null;
  poster_path: string | null;
  status: LibraryStatus;
  total_episodes: number | null;
  watched_episodes: number;
};

type DiaryRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: string | null;
  poster_path: string | null;
  detail: string;
  watched_on: string;
  rating: number | null;
  note: string | null;
};

type TrophyRow = {
  badge_id: string;
  badge_name: string;
  badge_description: string;
  level: number;
  level_key: string;
  level_name: string;
  unlocked_at: string;
};

function validatedUsername(value: string): string {
  const username = normalizeUsername(value);
  if (usernameValidationError(username)) {
    throw new Error('Profilo non valido');
  }
  return username;
}

export async function getFollowedProfile(username: string): Promise<FollowedProfile> {
  const { data, error } = await getSupabase().rpc('get_followed_profile', {
    p_username: validatedUsername(username),
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = ((data ?? []) as ProfileRow[])[0];
  if (!row) {
    throw new Error('Profilo non disponibile');
  }
  return {
    username: row.username,
    displayName: row.display_name,
    libraryCount: Number(row.library_count),
    diaryCount: Number(row.diary_count),
  };
}

export async function getFollowedLibrary(
  username: string,
): Promise<FollowedLibraryItem[]> {
  const { data, error } = await getSupabase().rpc('get_followed_library', {
    p_username: validatedUsername(username),
  });
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as LibraryRow[]).map((row) => ({
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    posterUrl: posterUrl(row.poster_path),
    status: row.status,
    totalEpisodes: row.total_episodes,
    watchedEpisodes: Number(row.watched_episodes),
  }));
}

export async function getFollowedDiary(
  username: string,
  limit = 30,
  offset = 0,
): Promise<FollowedDiaryEntry[]> {
  const { data, error } = await getSupabase().rpc('get_followed_diary', {
    p_username: validatedUsername(username),
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as DiaryRow[]).map((row, index) => ({
    id: `${row.media_type}-${row.tmdb_id}-${row.watched_on}-${offset + index}`,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    posterUrl: posterUrl(row.poster_path),
    detail: row.detail,
    watchedOn: row.watched_on,
    rating: row.rating,
    note: row.note,
  }));
}

export async function getFollowedProfileTrophies(
  username: string,
): Promise<FollowedProfileTrophy[]> {
  const { data, error } = await getSupabase().rpc(
    'get_followed_profile_badges',
    {
      p_username: validatedUsername(username),
    },
  );
  if (error) {
    throw new Error(error.message);
  }
  const trophies = ((data ?? []) as TrophyRow[]).map((row) => {
    if (!isBadgeLevelKey(row.level_key)) {
      throw new Error(`Livello badge profilo non valido: ${row.level_key}`);
    }
    return {
      badgeId: row.badge_id,
      badgeName: row.badge_name,
      badgeDescription: row.badge_description,
      level: Number(row.level),
      levelKey: row.level_key,
      levelName: row.level_name,
      unlockedAt: row.unlocked_at,
    };
  });
  return sortProfileTrophies(trophies);
}
