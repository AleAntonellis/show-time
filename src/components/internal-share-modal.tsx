import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getShareContacts,
  shareTitleWithContact,
  type ShareContact,
} from '@/services/social';
import type { TitleDetails } from '@/services/tmdb';

export function InternalShareModal({
  details,
  onClose,
  onSent,
}: {
  details: TitleDetails;
  onClose: () => void;
  onSent: (username: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShareContacts()
      .then((nextContacts) => {
        if (!cancelled) {
          setContacts(nextContacts);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Impossibile caricare i contatti',
          );
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
  }, []);

  async function send() {
    const contact = contacts.find((item) => item.userId === selectedId);
    if (!contact || sending) {
      setError('Seleziona un contatto.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await shareTitleWithContact({
        recipientId: contact.userId,
        details,
        message,
      });
      onSent(contact.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invio non riuscito');
    } finally {
      setSending(false);
    }
  }

  function openContacts() {
    onClose();
    router.push('/contacts');
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.inner,
            {
              paddingTop: insets.top + Spacing.three,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" numberOfLines={2}>
                Invia “{details.title}”
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Scegli un contatto ShowTime.
              </ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText type="smallBold">Chiudi</ThemedText>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Brand.glowBlue} />
            </View>
          ) : error && contacts.length === 0 ? (
            <View style={styles.center}>
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            </View>
          ) : contacts.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="smallBold">Nessun contatto disponibile</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Cerca un utente e attendi che accetti la tua richiesta.
              </ThemedText>
              <Pressable onPress={openContacts} style={styles.contactsButton}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Apri Contatti
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contacts}>
                {contacts.map((contact) => {
                  const selected = selectedId === contact.userId;
                  return (
                    <Pressable
                      key={contact.userId}
                      onPress={() => setSelectedId(contact.userId)}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView
                        type={selected ? 'backgroundSelected' : 'backgroundElement'}
                        style={[styles.contact, selected && styles.contactSelected]}>
                        <View style={styles.avatar}>
                          <ThemedText type="smallBold" style={styles.avatarText}>
                            {contact.username.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={styles.contactCopy}>
                          <ThemedText type="smallBold">@{contact.username}</ThemedText>
                          {contact.displayName && (
                            <ThemedText type="small" themeColor="textSecondary">
                              {contact.displayName}
                            </ThemedText>
                          )}
                        </View>
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected && <View style={styles.radioDot} />}
                        </View>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ThemedView type="backgroundElement" style={styles.composer}>
                <ThemedText type="smallBold">Messaggio opzionale</ThemedText>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Perché lo consigli?"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  style={[styles.input, { color: theme.text }]}
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
                  {message.length}/500
                </ThemedText>

                {error && (
                  <ThemedText type="small" style={styles.error}>
                    {error}
                  </ThemedText>
                )}

                <Pressable
                  onPress={send}
                  disabled={sending || !selectedId}
                  style={({ pressed }) => [
                    styles.sendButton,
                    pressed && styles.pressed,
                    (sending || !selectedId) && styles.disabled,
                  ]}>
                  {sending ? (
                    <ActivityIndicator color={Brand.pureWhite} size="small" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.buttonText}>
                      Invia su ShowTime
                    </ThemedText>
                  )}
                </Pressable>
              </ThemedView>
            </>
          )}
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  contactsButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: Brand.glowBlue,
  },
  contacts: {
    gap: Spacing.two,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contactSelected: {
    borderColor: Brand.glowBlue,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: Brand.softViolet,
  },
  avatarText: {
    color: Brand.pureWhite,
  },
  contactCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  radioSelected: {
    borderColor: Brand.glowBlue,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.glowBlue,
  },
  composer: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    minHeight: 92,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  counter: {
    textAlign: 'right',
  },
  sendButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    backgroundColor: Brand.glowBlue,
  },
  buttonText: {
    color: Brand.pureWhite,
  },
  error: {
    color: Brand.sunsetOrange,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
