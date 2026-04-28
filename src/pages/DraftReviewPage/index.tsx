import React, { useMemo, useState } from 'react';
import { SecondaryPage } from '../../components/SecondaryPage';
import { DynamicGuziForm, createGuziFormValues, type GuziFormValues } from '../../components/Forms/DynamicGuziForm';
import { api } from '../../service/api.service';
import { useInventoryStore } from '../../store/inventoryStore';
import type { GuziItem } from '../../types/models/guzi.schema';
import { removeDraftFormCacheEntry, updateDraftFormCache } from '../../utils/draftFormCache';
import { getHorizontalSwipeDirection, type SwipePoint } from '../../utils/edgeSwipe';

interface DraftReviewPageProps {
  onDone: (target: 'items' | 'upload') => void;
}

export const DraftReviewPage: React.FC<DraftReviewPageProps> = ({ onDone }) => {
  const draftItem = useInventoryStore((state) => state.draftItem);
  const draftQueue = useInventoryStore((state) => state.draftQueue);
  const setDraftItem = useInventoryStore((state) => state.setDraftItem);
  const clearDraftItem = useInventoryStore((state) => state.clearDraftItem);
  const confirmDraft = useInventoryStore((state) => state.confirmDraft);
  const draftPosition = draftItem ? Math.max(draftQueue.findIndex((item) => item.id === draftItem.id) + 1, 1) : 0;
  const [draftValuesById, setDraftValuesById] = useState<Record<string, GuziFormValues>>({});
  const [touchStart, setTouchStart] = useState<SwipePoint | null>(null);
  const draftValues = useMemo(() => {
    if (!draftItem) {
      return undefined;
    }

    return draftValuesById[draftItem.id] ?? createGuziFormValues(draftItem);
  }, [draftItem, draftValuesById]);

  const updateDraftValues = (values: GuziFormValues) => {
    if (!draftItem) {
      return;
    }

    setDraftValuesById((current) => updateDraftFormCache(current, draftItem.id, values));
  };

  const switchDraft = (direction: -1 | 1) => {
    if (!draftItem) {
      return;
    }

    const currentIndex = draftQueue.findIndex((item) => item.id === draftItem.id);
    const nextDraft = draftQueue[currentIndex + direction];

    if (nextDraft) {
      setDraftItem(nextDraft);
    }
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];

    if (!touch || touch.clientX <= 24) {
      setTouchStart(null);
      return;
    }

    setTouchStart({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];

    if (!touchStart || !touch) {
      return;
    }

    const direction = getHorizontalSwipeDirection(touchStart, { clientX: touch.clientX, clientY: touch.clientY });

    if (direction === 'previous') {
      switchDraft(-1);
    }

    if (direction === 'next') {
      switchDraft(1);
    }

    setTouchStart(null);
  };

  const confirmItem = async (item: GuziItem) => {
    await api.createItem(item);
    confirmDraft(item);
    setDraftValuesById((current) => removeDraftFormCacheEntry(current, item.id));

    if (draftQueue.length <= 1) {
      onDone('items');
    }
  };

  const discardDraft = () => {
    clearDraftItem();
    onDone('upload');
  };

  return (
    <SecondaryPage title="确认识别草稿" eyebrow="确认小票" onBack={discardDraft} className="draft-review-page">
      {draftItem ? (
        <section className="receipt-card" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <p className="inline-note">
            {draftQueue.length > 1
              ? `第 ${draftPosition} / ${draftQueue.length} 件待确认，左右滑切换。`
              : '检查识别结果，确认后放进仓库。'}
          </p>
          {draftQueue.length > 1 ? (
            <div className="draft-switcher">
              <button type="button" onClick={() => switchDraft(-1)} disabled={draftPosition <= 1}>
                上一件
              </button>
              <button type="button" onClick={() => switchDraft(1)} disabled={draftPosition >= draftQueue.length}>
                下一件
              </button>
            </div>
          ) : null}
          <div className="draft-preview">
            <img src={draftItem.imageUrl} alt={draftItem.name} />
            <span>{draftItem.type}</span>
          </div>
          <DynamicGuziForm
            mode="draft"
            initialData={draftItem}
            values={draftValues}
            onValuesChange={updateDraftValues}
            onSubmit={confirmItem}
            onCancel={discardDraft}
          />
        </section>
      ) : (
        <section className="empty-card">
          <span className="empty-illustration">◇</span>
          <h2>暂无待确认草稿</h2>
          <p>先从录入页生成一张识别草稿。</p>
          <button type="button" className="primary-button" onClick={() => onDone('upload')}>
            返回录入
          </button>
        </section>
      )}
    </SecondaryPage>
  );
};

export default DraftReviewPage;
