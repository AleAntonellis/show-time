import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import {
  acceptTitleShareInvite,
  claimTitleShareInvite,
  declineTitleShareInvite,
  type ShareInvitePreview,
} from '@/services/social';
import type { MediaType } from '@/services/tmdb';

export function ShareInviteBanner({
  token,
  mediaType,
  tmdbId,
  onOpenOnly,
}: {
  token: string;
  mediaType: MediaType;
  tmdbId: number;
  onOpenOnly: () => void;
}) {
  const [invite, setInvite] = useState<ShareInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    claimTitleShareInvite(token)
      .then((nextInvite) => {
        if (cancelled) {
          return;
        }
        if (nextInvite.mediaType !== mediaType || nextInvite.tmdbId !== tmdbId) {
          router.replace({
            pathname: '/title',
            params: {
              mediaType: nextInvite.mediaType,
              id: String(nextInvite.tmdbId),
              invite: token,
            },
          });
          return;
        }
        setInvite(nextInvite);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invito non disponibile');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, tmdbId, token]);

  async function accept() {
    if (!invite || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await acceptTitleShareInvite(token);
      setInvite({ ...invite, status: 'accepted' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile accettare l’invito');
    } finally {
      setBusy(false);
    }
  }

  async function openOnly() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await declineTitleShareInvite(token);
      onOpenOnly();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile risolvere l’invito');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <ThemedView type="backgroundElement" style={styles.loading}>
        <ActivityIndicator color={Brand.softViolet} size="small" />
        <ThemedText type="small" themeColor="textSecondary">
          Verifica dell’invito…
        </ThemedText>
      </ThemedView>
    );
  }

  if (error && !invite) {
    return (
      <ThemedView type="backgroundElement" style={styles.banner}>
        <ThemedText type="smallBold" style={styles.error}>
          Link di condivisione non disponibile
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {error}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!invite) {
    return null;
  }

  if (invite.status === 'accepted') {
    return (
      <ThemedView type="backgroundElement" style={styles.accepted}>
        <ThemedText type="smallBold" style={styles.acceptedTitle}>
          Contatto aggiunto
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          @{invite.senderUsername} è ora un contatto reciproco e il titolo è stato
          registrato nella tua Inbox.
        </ThemedText>
      </ThemedView>
    );
  }

  if (invite.status === 'declined') {
    return null;
  }

  return (
    <ThemedView type="backgroundElement" style={styles.banner}>
      <View style={styles.copy}>
        <ThemedText type="smallBold">
          @{invite.senderUsername} ti ha condiviso questo titolo
        </ThemedText>
        {invite.senderDisplayName && (
          <ThemedText type="small" themeColor="textSecondary">
            {invite.senderDisplayName}
          </ThemedText>
        )}
        {invite.message && (
          <ThemedText type="small" style={styles.message}>
            “{invite.message}”
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          Accettando diventerete contatti e potrete condividere titoli in entrambe le
          direzioni.
        </ThemedText>
      </View>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={accept}
          disabled={busy}
          style={({ pressed }) => [
            styles.acceptButton,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}>
          {busy ? (
            <ActivityIndicator color={Brand.pureWhite} size="small" />
          ) : (
            <ThemedText type="smallBold" style={styles.acceptButtonText}>
              Accetta contatto
            </ThemedText>
          )}
        </Pressable>
        <Pressable onPress={openOnly} disabled={busy} style={styles.openOnlyButton}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Apri soltanto
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  banner: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(106,76,255,0.38)',
  },
  accepted: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(47,107,255,0.38)',
  },
  acceptedTitle: {
    color: Brand.glowBlue,
  },
  copy: {
    gap: Spacing.one,
  },
  message: {
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  acceptButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: Brand.softViolet,
  },
  acceptButtonText: {
    color: Brand.pureWhite,
  },
  openOnlyButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  error: {
    color: Brand.sunsetOrange,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
