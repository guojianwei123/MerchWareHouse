import React, { useEffect, useMemo, useState } from 'react';
import { DraggableItem } from '../../components/Spatial/DraggableItem';
import homeShowcase from '../../assets/aqua-opera/home-showcase.png';
import iconBatchBox from '../../assets/aqua-opera/icon-batch-box.png';
import iconItemStar from '../../assets/aqua-opera/icon-item-star.png';
import iconLinkChain from '../../assets/aqua-opera/icon-link-chain.png';
import iconRoomCabinet from '../../assets/aqua-opera/icon-room-cabinet.png';
import { calculateAssetDashboard } from '../../service/asset-dashboard.service';
import { defaultShowcaseService } from '../../service/showcase.service';
import { SpatialService } from '../../service/spatial.service';
import { useInventoryStore } from '../../store/inventoryStore';
import { useRoomStore } from '../../store/roomStore';
import type { SpatialNode } from '../../types/models/spatial.schema';

const spatialService = new SpatialService();

const createDefaultLayout = (): SpatialNode[] => [
  { id: 'room-1', nodeType: 'room', x: 0, y: 0, width: 340, height: 420 },
  { id: 'shelf-top', nodeType: 'shelf', parentId: 'room-1', x: 32, y: 92, width: 276, height: 18 },
  { id: 'shelf-mid', nodeType: 'shelf', parentId: 'room-1', x: 32, y: 212, width: 276, height: 18 },
  { id: 'badge-item', nodeType: 'item', parentId: 'room-1', guziId: 'badge-1', x: 58, y: 126, width: 72, height: 72 },
  { id: 'card-item', nodeType: 'item', parentId: 'room-1', guziId: 'card-1', x: 148, y: 118, width: 58, height: 84 },
  { id: 'acrylic-item', nodeType: 'item', parentId: 'room-1', guziId: 'acrylic-1', x: 226, y: 128, width: 58, height: 78 },
  { id: 'plush-item', nodeType: 'item', parentId: 'room-1', guziId: 'plush-1', x: 92, y: 250, width: 80, height: 64 },
];

export const RoomEditorPage: React.FC = () => {
  const title = useRoomStore((state) => state.title);
  const isPublic = useRoomStore((state) => state.isPublic);
  const nodes = useRoomStore((state) => state.nodes);
  const setTitle = useRoomStore((state) => state.setTitle);
  const setIsPublic = useRoomStore((state) => state.setIsPublic);
  const setNodes = useRoomStore((state) => state.setNodes);
  const updateNodePosition = useRoomStore((state) => state.updateNodePosition);
  const saveShowcase = useRoomStore((state) => state.saveShowcase);
  const items = useInventoryStore((state) => state.items);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (nodes.length === 0) {
      setNodes(createDefaultLayout());
    }
  }, [nodes.length, setNodes]);

  const invalidNodeIds = useMemo(() => {
    return new Set(
      nodes
        .filter((node) => {
          if (!node.parentId || node.nodeType === 'shelf') {
            return false;
          }

          const container = nodes.find((candidate) => candidate.id === node.parentId);

          if (!container) {
            return true;
          }

          return !spatialService.validatePlacement(container, nodes.filter((item) => item.nodeType === 'item'), node).valid;
        })
        .map((node) => node.id),
    );
  }, [nodes]);

  const room = nodes.find((node) => node.nodeType === 'room');
  const displayNodes = nodes.filter((node) => node.parentId);
  const stats = useMemo(() => calculateAssetDashboard(items), [items]);

  const handleSave = async () => {
    const saved = saveShowcase();
    await defaultShowcaseService.saveShowcase(saved);
    setSavedId(saved.id);
  };

  return (
    <div className="page-stack room-editor-page">
      <header className="home-header">
        <div>
          <h1>谷子仓库</h1>
          <p>今天也把喜欢收好</p>
        </div>
        <span className="theme-pill">
          <img src={iconLinkChain} alt="" aria-hidden="true" />
          水蓝剧场
        </span>
      </header>

      <section className="home-showcase-card">
        <div className="cabinet-asset-plaque">
          <span>资产总值</span>
          <strong>¥{stats.marketPriceTotal.toFixed(2)}</strong>
          <small>{stats.itemCount}件谷子</small>
        </div>
        <img src={homeShowcase} alt="水蓝剧场展示柜" className="home-showcase-image" />
      </section>

      <section className="home-shortcuts">
        <button type="button" onClick={() => setEditorOpen((open) => !open)}>
          <img src={iconRoomCabinet} alt="" aria-hidden="true" />
          <span>我的柜子</span>
        </button>
        <button type="button">
          <img src={iconBatchBox} alt="" aria-hidden="true" />
          <span>最近新增</span>
        </button>
        <button type="button">
          <img src={iconItemStar} alt="" aria-hidden="true" />
          <span>心愿单</span>
        </button>
        <button type="button">
          <img src={iconLinkChain} alt="" aria-hidden="true" />
          <span>待整理</span>
        </button>
      </section>

      <section className={`editor-panel layout-editor ${editorOpen ? 'open' : ''}`}>
        <div className="section-heading editor-heading">
          <div>
            <span className="eyebrow">布置柜子</span>
            <h2>{title}</h2>
          </div>
          <span className="status-badge">{isPublic ? '公开展示' : '私密收纳'}</span>
        </div>
        <div
          className="cabinet-stage"
          style={{ width: room?.width ?? 340, height: room?.height ?? 420 }}
        >
          <div className="cabinet-back" />
          <div className="cabinet-side left" />
          <div className="cabinet-side right" />
          {displayNodes.map((node) => {
            if (node.nodeType === 'shelf') {
              return (
                <div
                  key={node.id}
                  className="cabinet-shelf"
                  style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                />
              );
            }

            return (
              <DraggableItem
                key={node.id}
                id={node.id}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                invalid={invalidNodeIds.has(node.id)}
                onMove={updateNodePosition}
              />
            );
          })}
        </div>
        <label className="field-label">
          展示柜名
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
          />
          公开分享
        </label>
        {savedId ? <p className="inline-note">已保存：{savedId}</p> : null}
        {invalidNodeIds.size > 0 ? <p className="inline-alert" role="alert">存在重叠或越界节点，无法保存。</p> : null}
        <div className="toolbar">
          <button type="button" onClick={() => setNodes(createDefaultLayout())}>重置柜体</button>
          <button type="button">添加层板</button>
          <button type="button">添加物品</button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={invalidNodeIds.size > 0 || nodes.length === 0}>
            保存
          </button>
        </div>
      </section>
    </div>
  );
};

export default RoomEditorPage;
