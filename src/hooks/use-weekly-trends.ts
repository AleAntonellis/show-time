import { useCallback, useEffect, useState } from 'react';

import {
  getWeeklyTrendingTitles,
  type Title,
  type TrendingMediaFilter,
} from '@/services/tmdb';

export function useWeeklyTrends(
  mediaFilter: TrendingMediaFilter,
  enabled = true,
): {
  titles: Title[];
  loading: boolean;
  error: string | null;
  retry: () => void;
} {
  const [titlesByFilter, setTitlesByFilter] = useState<
    Partial<Record<TrendingMediaFilter, Title[]>>
  >({});
  const [errorsByFilter, setErrorsByFilter] = useState<
    Partial<Record<TrendingMediaFilter, string>>
  >({});
  const [retryVersion, setRetryVersion] = useState(0);
  const titles = titlesByFilter[mediaFilter];
  const error = errorsByFilter[mediaFilter] ?? null;

  useEffect(() => {
    if (!enabled || titles !== undefined || error) {
      return;
    }

    let active = true;
    void getWeeklyTrendingTitles(mediaFilter)
      .then((nextTitles) => {
        if (active) {
          setTitlesByFilter((current) => ({
            ...current,
            [mediaFilter]: nextTitles,
          }));
        }
      })
      .catch((err) => {
        if (active) {
          setErrorsByFilter((current) => ({
            ...current,
            [mediaFilter]:
              err instanceof Error
                ? err.message
                : 'Impossibile caricare i trend.',
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, error, mediaFilter, retryVersion, titles]);

  const retry = useCallback(() => {
    setErrorsByFilter((current) => {
      const next = { ...current };
      delete next[mediaFilter];
      return next;
    });
    setRetryVersion((current) => current + 1);
  }, [mediaFilter]);

  return {
    titles: titles ?? [],
    loading: enabled && titles === undefined && !error,
    error,
    retry,
  };
}
