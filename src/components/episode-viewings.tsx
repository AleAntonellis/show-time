import { useCallback } from 'react';

import { ViewingHistory, type ViewingDraft } from '@/components/viewing-history';
import {
  addEpisodeViewing,
  getEpisodeViewings,
  removeEpisodeViewing,
  type LibraryItem,
} from '@/services/library';

type Props = {
  item: LibraryItem;
  seasonNumber: number;
  episodeNumber: number;
  totalEpisodes: number | null;
  onChanged: () => void | Promise<void>;
};

export function EpisodeViewingPanel({
  item,
  seasonNumber,
  episodeNumber,
  totalEpisodes,
  onChanged,
}: Props) {
  const loadViewings = useCallback(
    () => getEpisodeViewings(item.id, seasonNumber, episodeNumber),
    [episodeNumber, item.id, seasonNumber],
  );
  const createViewing = useCallback(
    (draft: ViewingDraft) =>
      addEpisodeViewing(
        item.id,
        seasonNumber,
        episodeNumber,
        totalEpisodes,
        draft.watchedOn,
        draft.note,
        draft.rating,
      ),
    [episodeNumber, item.id, seasonNumber, totalEpisodes],
  );
  const deleteViewing = useCallback(
    (viewingId: string) => removeEpisodeViewing(viewingId),
    [],
  );
  const changed = useCallback(() => {
    void onChanged();
  }, [onChanged]);

  return (
    <ViewingHistory
      title=""
      description="Registra ogni visione dell'episodio con data, nota e voto."
      loadViewings={loadViewings}
      createViewing={createViewing}
      deleteViewing={deleteViewing}
      onChanged={changed}
      embedded
    />
  );
}
