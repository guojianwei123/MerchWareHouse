import React, { useMemo } from 'react';
import { assetDashboardGroupKeys, calculateAssetDashboard } from '../../service/asset-dashboard.service';
import { useInventoryStore } from '../../store/inventoryStore';

const formatCny = (value: number): string => `¥${value.toFixed(2)}`;
const groupLabels = {
  ip: 'IP',
  character: '角色',
  series: '系列',
  type: '品类',
};

export const AssetDashboardPage: React.FC = () => {
  const items = useInventoryStore((state) => state.items);
  const stats = useMemo(() => calculateAssetDashboard(items), [items]);

  return (
    <div className="page-stack asset-dashboard-page">
      <header className="asset-plaque">
        <span>资产总值</span>
        <strong>{formatCny(stats.marketPriceTotal)}</strong>
        <small>{new Date().toLocaleDateString('zh-CN')}</small>
      </header>

      <section className="metric-grid">
        <article><span>总投入</span><strong>{formatCny(stats.purchasePriceTotal)}</strong></article>
        <article><span>当前估值</span><strong>{formatCny(stats.marketPriceTotal)}</strong></article>
        <article><span>物品数量</span><strong>{stats.itemCount}件</strong></article>
        <article><span>盈亏估算</span><strong>{formatCny(stats.profit)}</strong></article>
      </section>

      {stats.isEmpty ? (
        <section className="empty-card">
          <span className="empty-illustration">◇</span>
          <h2>还没有入库的谷子</h2>
          <p>生成草稿并确认入库后，资产看板会自动更新。</p>
        </section>
      ) : (
        <section className="group-stack">
          {assetDashboardGroupKeys.map((groupKey) => (
            <article key={groupKey} className="group-card">
              <h2>{groupLabels[groupKey]}</h2>
              {stats.groups[groupKey].slice(0, 3).map((group) => (
                <div key={group.key} className="group-row">
                  <span>{group.key}</span>
                  <strong>{formatCny(group.marketPriceTotal)}</strong>
                  <small>{group.count}件 · {(group.marketShare * 100).toFixed(1)}%</small>
                </div>
              ))}
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default AssetDashboardPage;
