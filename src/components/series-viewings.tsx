import { useCallback } from 'react';

import { ViewingHistory, type ViewingDraft } from '@/components/viewing-history';
import {
  addSeriesViewing,
  getSeriesViewings,
  removeSeriesViewing,
  type LibraryItem,
} from '@/services/library';

type Props = {
  item: LibraryItem;
  onClose: () => void;
  onChanged: () => void;
};

export function SeriesViewings({ item, onClose, onChanged }: Props) {
  const loadViewings = useCallback(
    () => getSeriesViewings(item.id),
    [item.id],
  );
  const createViewing = useCallback(
    (draft: ViewingDraft) =>
      addSeriesViewing(
        item.id,
        draft.watchedOn,
        draft.note,
        draft.rating,
      ),
    [item.id],
  );
  const deleteViewing = useCallback(
    (viewingId: string) => removeSeriesViewing(viewingId),
    [],
  );
  const close = useCallback(
    (changed: boolean) => {
      if (changed) {
        onChanged();
      }
      onClose();
    },
    [onChanged, onClose],
  );

  return (
    <ViewingHistory
      title={`📺 ${item.title}`}
      description="Registra ogni visione completa della serie con data, nota e voto. Progresso e ore restano basati sugli episodi."
      loadViewings={loadViewings}
      createViewing={createViewing}
      deleteViewing={deleteViewing}
      onClose={close}
    />
  );
}
