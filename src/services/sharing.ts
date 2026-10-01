import { Platform, Share } from 'react-native';

import type { MediaType } from '@/services/tmdb';

const DEFAULT_PUBLIC_APP_URL = 'https://ashy-plant-0d5e71903.4.azurestaticapps.net';

type WebShareNavigator = Navigator & {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
};

export type ShareTitleResult = 'shared' | 'copied' | 'dismissed';

export function buildSharedTitleUrl(mediaType: MediaType, tmdbId: number): string {
  const baseUrl = process.env.EXPO_PUBLIC_APP_URL?.trim() || DEFAULT_PUBLIC_APP_URL;
  const url = new URL('/title', baseUrl);
  url.searchParams.set('mediaType', mediaType);
  url.searchParams.set('id', String(tmdbId));
  return url.toString();
}

export async function shareTitle({
  mediaType,
  tmdbId,
  title,
}: {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
}): Promise<ShareTitleResult> {
  const url = buildSharedTitleUrl(mediaType, tmdbId);
  const text = `Guarda ${title} su ShowTime`;

  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined') {
      throw new Error('Condivisione non disponibile in questo ambiente');
    }
    const webNavigator = navigator as WebShareNavigator;
    if (webNavigator.share) {
      try {
        await webNavigator.share({ title: `${title} · ShowTime`, text, url });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'dismissed';
        }
        throw err;
      }
    }
    if (!webNavigator.clipboard) {
      throw new Error('Il browser non supporta la condivisione o la copia del link');
    }
    await webNavigator.clipboard.writeText(url);
    return 'copied';
  }

  const result = await Share.share(
    {
      title: `${title} · ShowTime`,
      message: `${text}\n${url}`,
      url,
    },
    {
      dialogTitle: `Condividi ${title}`,
    },
  );
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}
