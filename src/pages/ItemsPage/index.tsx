import React, { useEffect, useMemo, useState } from 'react';
import { DynamicGuziForm } from '../../components/Forms/DynamicGuziForm';
import { api } from '../../service/api.service';
import { useInventoryStore } from '../../store/inventoryStore';
import type { GuziItem, GuziType } from '../../types/models/guzi.schema';

const categoryLabels: Record<GuziType, string> = {
  paper_card: '纸片',
  acrylic: '亚克力',
  badge: '吧唧',
  fabric: '布艺',
  figure: '手办',
  practical: '实用',
  special: '特殊',
};

const filterOptions: Array<{ value: 'all' | GuziType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'badge', label: '吧唧' },
  { value: 'paper_card', label: '纸片' },
  { value: 'acrylic', label: '亚克力' },
  { value: 'fabric', label: '布艺' },
  { value: 'figure', label: '手办' },
  { value: 'practical', label: '实用' },
  { value: 'special', label: '特殊' },
];

export const ItemsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<'all' | GuziType>('all');
  const [editingItem, setEditingItem] = useState<GuziItem | null>(null);
  const items = useInventoryStore((state) => state.items);
  const setItems = useInventoryStore((state) => state.setItems);
  const updateItem = useInventoryStore((state) => state.updateItem);
  const removeItem = useInventoryStore((state) => state.removeItem);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listItems()
      .then(setItems)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '库存加载失败');
      });
  }, [setItems]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = activeType === 'all' || item.type === activeType;
      const matchesKeyword =
        !keyword ||
        [item.name, item.ip, item.character, item.series, item.type]
          .join(' ')
          .toLowerCase()
          .includes(keyword);

      return matchesType && matchesKeyword;
    });
  }, [activeType, items, query]);

  const saveEdit = async (item: GuziItem) => {
    setError(null);

    try {
      const saved = await api.updateItem(item);
      updateItem(saved);
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const deleteItem = async (item: GuziItem) => {
    setError(null);

    try {
      await api.deleteItem(item.id);
      removeItem(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="page-stack items-page">
      <header className="page-hero compact">
        <span className="eyebrow">物品</span>
        <h1>我的谷子收藏</h1>
        <p>按 IP、角色、系列和品类快速找到收藏。</p>
      </header>

      <label className="search-pill">
        <span>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索名称 / IP / 角色 / 系列"
        />
      </label>

      <div className="chip-row">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip ${activeType === option.value ? 'active' : ''}`}
            onClick={() => setActiveType(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? <p className="inline-alert" role="alert">{error}</p> : null}

      {editingItem ? (
        <section className="form-panel">
          <DynamicGuziForm
            mode="edit"
            initialData={editingItem}
            onSubmit={saveEdit}
            onCancel={() => setEditingItem(null)}
          />
        </section>
      ) : null}

      {filteredItems.length === 0 ? (
        <section className="empty-card">
          <span className="empty-illustration">◇</span>
          <h2>还没有入库的谷子</h2>
          <p>从底部的录入按钮开始，把喜欢收进展示柜。</p>
        </section>
      ) : (
        <section className="item-grid">
          {filteredItems.map((item) => (
            <article key={item.id} className="guzi-card">
              <div className="guzi-image">
                <img src={item.imageUrl} alt={item.name} />
                <span>¥{(item.marketPrice ?? item.purchasePrice ?? 0).toFixed(0)}</span>
              </div>
              <h2>{item.name}</h2>
              <p>{item.ip} · {item.character}</p>
              <small>{categoryLabels[item.type]}</small>
              <div className="card-actions">
                <button type="button" onClick={() => setEditingItem(item)}>
                  编辑
                </button>
                <button type="button" onClick={() => deleteItem(item)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default ItemsPage;
