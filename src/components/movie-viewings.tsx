import { useCallback } from 'react';

import { ViewingHistory, type ViewingDraft } from '@/components/viewing-history';
import {
  addViewing,
  getViewings,
  removeViewing,
  type LibraryItem,
} from '@/services/library';

type Props = {
  item: LibraryItem;
  onClose: () => void;
  onChanged: () => void;
};

export function MovieViewings({ item, onClose, onChanged }: Props) {
  const loadViewings = useCallback(() => getViewings(item.id), [item.id]);
  const createViewing = useCallback(
    (draft: ViewingDraft) =>
      addViewing(item.id, draft.watchedOn, draft.note, draft.rating),
    [item.id],
  );
  const deleteViewing = useCallback((viewingId: string) => removeViewing(viewingId), []);
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
      title={`🎬 ${item.title}`}
      description="Ogni visione può avere una nota e un voto diversi."
      loadViewings={loadViewings}
      createViewing={createViewing}
      deleteViewing={deleteViewing}
      onClose={close}
    />
  );
}
