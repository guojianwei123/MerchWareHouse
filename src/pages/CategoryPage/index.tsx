import React from 'react';
import { useInventoryStore } from '../../store/inventoryStore';

const categories = [
  { type: 'badge', label: '吧唧', tone: 'pink', icon: '◎' },
  { type: 'paper_card', label: '纸片', tone: 'blue', icon: '▱' },
  { type: 'acrylic', label: '亚克力', tone: 'mint', icon: '▵' },
  { type: 'figure', label: '手办', tone: 'gold', icon: '♙' },
  { type: 'fabric', label: '布艺', tone: 'blue', icon: '◒' },
  { type: 'practical', label: '实用', tone: 'mint', icon: '◈' },
  { type: 'special', label: '特殊', tone: 'pink', icon: '✦' },
];

export const CategoryPage: React.FC = () => {
  const items = useInventoryStore((state) => state.items);

  return (
    <div className="page-stack category-page">
      <header className="page-hero compact">
        <span className="eyebrow">品类</span>
        <h1>收纳册管理</h1>
        <p>每一种谷子都有自己的收纳位。</p>
      </header>

      <section className="folder-grid">
        <article className="folder-card create">
          <span className="folder-icon">+</span>
          <h2>固定七大分类</h2>
          <p>自定义品类暂未开放</p>
        </article>
        {categories.map((category) => {
          const count = items.filter((item) => item.type === category.type).length;

          return (
            <article key={category.type} className={`folder-card ${category.tone}`}>
              <span className="folder-icon">{category.icon}</span>
              <h2>{category.label}</h2>
              <p>{count} 件已启用</p>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default CategoryPage;
