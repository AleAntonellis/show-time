import type { RealtimeChannel } from '@supabase/supabase-js';

import { reconcileReadShareBadge } from '@/services/badges';
import { getSupabase } from '@/services/supabase';
import { posterUrl, type MediaType, type TitleDetails } from '@/services/tmdb';

export type FollowStatus = 'pending' | 'accepted' | 'rejected';
export type FollowDirection = 'incoming' | 'outgoing';
export type ShareBox = 'received' | 'sent';

export type PublicAccount = {
  id: string;
  username: string | null;
  displayName: string | null;
};

export type PublicProfileSearchResult = {
  id: string;
  username: string;
  displayName: string | null;
  outgoingStatus: FollowStatus | null;
  incomingStatus: FollowStatus | null;
};

export type FollowConnection = {
  followId: string;
  userId: string;
  username: string;
  displayName: string | null;
  direction: FollowDirection;
  status: FollowStatus;
  createdAt: string;
};

export type ShareContact = {
  followId: string;
  userId: string;
  username: string;
  displayName: string | null;
};

export type InternalTitleShare = {
  id: string;
  counterpartyId: string;
  counterpartyUsername: string;
  counterpartyDisplayName: string | null;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterUrl: string | null;
  message: string | null;
  createdAt: string;
  readAt: string | null;
};

export type ShareInviteStatus = 'pending' | 'accepted' | 'declined';

export type ShareInvitePreview = {
  inviteId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string | null;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterUrl: string | null;
  message: string | null;
  status: ShareInviteStatus;
  expiresAt: string;
};

type SearchRow = {
  id: string;
  username: string;
  display_name: string | null;
  outgoing_status: FollowStatus | null;
  incoming_status: FollowStatus | null;
};

type ConnectionRow = {
  follow_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  direction: FollowDirection;
  status: FollowStatus;
  created_at: string;
};

type ShareRow = {
  id: string;
  counterparty_id: string;
  counterparty_username: string;
  counterparty_display_name: string | null;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: string | null;
  poster_path: string | null;
  message: string | null;
  created_at: string;
  read_at: string | null;
};

type ShareInviteRow = {
  invite_id: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string | null;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: string | null;
  poster_path: string | null;
  message: string | null;
  status: ShareInviteStatus;
  expires_at: string;
};

let realtimeSubscriptionCounter = 0;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameValidationError(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < 3 || username.length > 24) {
    return 'Lo username deve contenere da 3 a 24 caratteri.';
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Usa solo lettere minuscole, numeri e underscore.';
  }
  return null;
}

export async function getMyPublicAccount(): Promise<PublicAccount> {
  const { data: userData, error: userError } = await getSupabase().auth.getUser();
  if (userError || !userData.user) {
    throw new Error(userError?.message ?? 'Sessione non valida');
  }
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', userData.user.id)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
  };
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const validationError = usernameValidationError(username);
  if (validationError) {
    return false;
  }
  const { data, error } = await getSupabase().rpc('username_available', {
    p_username: normalizeUsername(username),
  });
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export async function setPublicUsername(username: string): Promise<string> {
  const validationError = usernameValidationError(username);
  if (validationError) {
    throw new Error(validationError);
  }
  const { data, error } = await getSupabase().rpc('set_username', {
    p_username: normalizeUsername(username),
  });
  if (error) {
    throw new Error(error.message);
  }
  return String(data);
}

export async function searchPublicProfiles(
  query: string,
): Promise<PublicProfileSearchResult[]> {
  const normalized = normalizeUsername(query);
  if (normalized.length < 2) {
    throw new Error('Inserisci almeno 2 caratteri per la ricerca.');
  }
  const { data, error } = await getSupabase().rpc('search_public_profiles', {
    p_query: normalized,
  });
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as SearchRow[]).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    outgoingStatus: row.outgoing_status,
    incomingStatus: row.incoming_status,
  }));
}

export async function getFollowConnections(): Promise<FollowConnection[]> {
  const { data, error } = await getSupabase().rpc('get_follow_connections');
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as ConnectionRow[]).map((row) => ({
    followId: row.follow_id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    direction: row.direction,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function requestFollow(userId: string): Promise<void> {
  const { error } = await getSupabase().rpc('request_follow', {
    p_user_id: userId,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function respondFollow(followId: string, accept: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('respond_follow', {
    p_follow_id: followId,
    p_accept: accept,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFollow(followId: string): Promise<void> {
  const { error } = await getSupabase().rpc('remove_follow', {
    p_follow_id: followId,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getShareContacts(): Promise<ShareContact[]> {
  const connections = await getFollowConnections();
  return connections
    .filter(
      (connection) =>
        connection.direction === 'outgoing' && connection.status === 'accepted',
    )
    .map((connection) => ({
      followId: connection.followId,
      userId: connection.userId,
      username: connection.username,
      displayName: connection.displayName,
    }));
}

export async function shareTitleWithContact({
  recipientId,
  details,
  message,
}: {
  recipientId: string;
  details: TitleDetails;
  message: string | null;
}): Promise<string> {
  const trimmedMessage = message?.trim() || null;
  if (trimmedMessage && trimmedMessage.length > 500) {
    throw new Error('Il messaggio può contenere al massimo 500 caratteri.');
  }
  const { data, error } = await getSupabase().rpc('share_title_with_contact', {
    p_recipient_id: recipientId,
    p_tmdb_id: details.id,
    p_media_type: details.mediaType,
    p_title: details.title,
    p_year: details.year,
    p_poster_path: details.posterPath,
    p_message: trimmedMessage,
  });
  if (error) {
    throw new Error(error.message);
  }
  return String(data);
}

export async function createTitleShareInvite(
  details: TitleDetails,
  message: string | null = null,
): Promise<string> {
  const trimmedMessage = message?.trim() || null;
  if (trimmedMessage && trimmedMessage.length > 500) {
    throw new Error('Il messaggio può contenere al massimo 500 caratteri.');
  }
  const { data, error } = await getSupabase().rpc('create_title_share_invite', {
    p_tmdb_id: details.id,
    p_media_type: details.mediaType,
    p_title: details.title,
    p_year: details.year,
    p_poster_path: details.posterPath,
    p_message: trimmedMessage,
  });
  if (error) {
    throw new Error(error.message);
  }
  return String(data);
}

function toShareInvite(row: ShareInviteRow): ShareInvitePreview {
  return {
    inviteId: row.invite_id,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    senderDisplayName: row.sender_display_name,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    posterUrl: posterUrl(row.poster_path),
    message: row.message,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

export async function claimTitleShareInvite(
  token: string,
): Promise<ShareInvitePreview> {
  const { data, error } = await getSupabase().rpc('claim_title_share_invite', {
    p_token: token,
  });
  if (error) {
    throw new Error(error.message);
  }
  const row = ((data ?? []) as ShareInviteRow[])[0];
  if (!row) {
    throw new Error('Invito non disponibile');
  }
  return toShareInvite(row);
}

export async function acceptTitleShareInvite(token: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('accept_title_share_invite', {
    p_token: token,
  });
  if (error) {
    throw new Error(error.message);
  }
  const shareId = String(data);
  reconcileShareReadBadge(shareId);
  return shareId;
}

export async function declineTitleShareInvite(token: string): Promise<void> {
  const { error } = await getSupabase().rpc('decline_title_share_invite', {
    p_token: token,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function revokeTitleShareInvite(token: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('revoke_title_share_invite', {
    p_token: token,
  });
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export async function getInternalTitleShares(
  box: ShareBox,
): Promise<InternalTitleShare[]> {
  const { data, error } = await getSupabase().rpc('get_title_shares', {
    p_box: box,
  });
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as ShareRow[]).map((row) => ({
    id: row.id,
    counterpartyId: row.counterparty_id,
    counterpartyUsername: row.counterparty_username,
    counterpartyDisplayName: row.counterparty_display_name,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    posterUrl: posterUrl(row.poster_path),
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

export async function markInternalShareRead(shareId: string): Promise<void> {
  const { error } = await getSupabase().rpc('mark_title_share_read', {
    p_share_id: shareId,
  });
  if (error) {
    throw new Error(error.message);
  }
  reconcileShareReadBadge(shareId);
}

function reconcileShareReadBadge(shareId: string): void {
  void reconcileReadShareBadge(shareId).catch((error: unknown) => {
    console.error(
      'Passaparola reconciliation failed:',
      error instanceof Error ? error.message : error,
    );
  });
}

export async function getUnreadShareCount(): Promise<number> {
  const { data, error } = await getSupabase().rpc('get_unread_share_count');
  if (error) {
    throw new Error(error.message);
  }
  return Number(data ?? 0);
}

export async function subscribeToInternalShares(
  onChange: () => void,
): Promise<RealtimeChannel> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error(error?.message ?? 'Sessione non valida');
  }
  realtimeSubscriptionCounter += 1;
  return getSupabase()
    .channel(
      `title-shares-${data.user.id}-${Date.now()}-${realtimeSubscriptionCounter}`,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'title_shares',
        filter: `recipient_id=eq.${data.user.id}`,
      },
      onChange,
    )
    .subscribe();
}

export async function unsubscribeFromInternalShares(
  channel: RealtimeChannel,
): Promise<void> {
  const result = await getSupabase().removeChannel(channel);
  if (result === 'error' || result === 'timed out') {
    throw new Error('Impossibile chiudere la subscription Realtime');
  }
}
