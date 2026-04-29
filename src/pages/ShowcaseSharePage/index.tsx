import React, { useEffect, useState } from 'react';
import { api } from '../../service/api.service';
import { useRoomStore } from '../../store/roomStore';
import type { ShowcasePublicView } from '../../types/models/spatial.schema';

export const ShowcaseSharePage: React.FC = () => {
  const [showcaseId, setShowcaseId] = useState(() => new URLSearchParams(window.location.search).get('showcase') ?? '');
  const [view, setView] = useState<ShowcasePublicView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loadShowcase = useRoomStore((state) => state.loadShowcase);

  const loadPublicView = async () => {
    setError(null);

    try {
      setView(await api.getPublicShowcase(showcaseId));
    } catch (err) {
      setView(null);
      setError(err instanceof Error ? err.message : '展示柜不存在或未公开。');
    }
  };

  const saveSameLayout = async () => {
    setError(null);
    setNotice(null);

    try {
      const cloned = await api.cloneShowcase(showcaseId);
      loadShowcase(cloned);
      setNotice(`已保存同款布局：${cloned.title}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存同款布局失败');
    }
  };

  useEffect(() => {
    if (showcaseId) {
      void loadPublicView();
    }
  }, []);

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
      {notice ? <p className="inline-note">{notice}</p> : null}

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
          <button type="button" onClick={saveSameLayout}>保存同款布局</button>
        </section>
      ) : null}
    </div>
  );
};

export default ShowcaseSharePage;
