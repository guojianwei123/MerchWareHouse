import React, { useState } from 'react';
import { defaultShowcaseService } from '../../service/showcase.service';
import { useInventoryStore } from '../../store/inventoryStore';
import type { ShowcasePublicView } from '../../types/models/spatial.schema';

export const ShowcaseSharePage: React.FC = () => {
  const [showcaseId, setShowcaseId] = useState('');
  const [view, setView] = useState<ShowcasePublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = useInventoryStore((state) => state.items);

  const loadPublicView = async () => {
    setError(null);
    const publicView = await defaultShowcaseService.getPublicView(showcaseId, items);

    if (!publicView) {
      setView(null);
      setError('展示柜不存在或未公开。');
      return;
    }

    setView(publicView);
  };

  return (
    <div className="page-stack showcase-share-page">
      <header className="page-hero compact">
        <span className="eyebrow">分享预览</span>
        <h1>公开展示柜</h1>
        <p>只展示名称、IP、角色、系列、分类和图片。</p>
      </header>

      <section className="share-loader">
        <label className="field-label">
          分享 ID
          <input value={showcaseId} onChange={(event) => setShowcaseId(event.target.value)} placeholder="showcase_..." />
        </label>
        <button type="button" className="primary-button" onClick={loadPublicView} disabled={!showcaseId}>
          打开分享
        </button>
      </section>
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}

      {view ? (
        <section className="public-cabinet">
          <h2>{view.title}</h2>
          <div className="share-stage">
            {view.nodes
              .filter((node) => node.parentId)
              .map((node) => (
                <span
                  key={node.id}
                  style={{
                    left: `${Math.min(node.x / 4, 80)}%`,
                    top: `${Math.min(node.y / 4, 76)}%`,
                  }}
                >
                  {node.guziId ?? node.nodeType}
                </span>
              ))}
          </div>
          <ul className="public-item-list">
            {view.items.map((item) => (
              <li key={item.guziId}>
                <img src={item.imageUrl} alt={item.name} />
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.ip} · {item.character} · {item.series}</span>
                </div>
                <small>{item.type}</small>
              </li>
            ))}
          </ul>
          <button type="button">保存同款布局</button>
        </section>
      ) : null}
    </div>
  );
};

export default ShowcaseSharePage;
