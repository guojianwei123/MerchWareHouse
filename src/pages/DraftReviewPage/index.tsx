import React from 'react';
import { DynamicGuziForm } from '../../components/Forms/DynamicGuziForm';
import { useInventoryStore } from '../../store/inventoryStore';
import type { GuziItem } from '../../types/models/guzi.schema';

interface DraftReviewPageProps {
  onDone: (target: 'items' | 'upload') => void;
}

export const DraftReviewPage: React.FC<DraftReviewPageProps> = ({ onDone }) => {
  const draftItem = useInventoryStore((state) => state.draftItem);
  const clearDraftItem = useInventoryStore((state) => state.clearDraftItem);
  const addItem = useInventoryStore((state) => state.addItem);

  const confirmItem = (item: GuziItem) => {
    addItem(item);
    clearDraftItem();
    onDone('items');
  };

  const discardDraft = () => {
    clearDraftItem();
    onDone('upload');
  };

  return (
    <div className="page-stack draft-review-page">
      <header className="page-hero compact receipt-hero">
        <span className="eyebrow">确认小票</span>
        <h1>确认这件谷子</h1>
        <p>检查识别结果，确认后放进仓库。</p>
      </header>

      {draftItem ? (
        <section className="receipt-card">
          <div className="draft-preview">
            <img src={draftItem.imageUrl} alt={draftItem.name} />
            <span>{draftItem.type}</span>
          </div>
          <DynamicGuziForm
            mode="draft"
            initialData={draftItem}
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
    </div>
  );
};

export default DraftReviewPage;
