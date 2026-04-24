import React, { useState } from 'react';
import iconProfileCrown from '../../assets/aqua-opera/icon-profile-crown.png';
import ornamentShell from '../../assets/aqua-opera/ornament-shell.png';
import themeCreamThumb from '../../assets/aqua-opera/theme-cream-thumb.png';
import themeMintThumb from '../../assets/aqua-opera/theme-mint-thumb.png';
import themeWaterTheater from '../../assets/aqua-opera/theme-water-theater.png';
import themeWaterThumb from '../../assets/aqua-opera/theme-water-thumb.png';
import { calculateAssetDashboard } from '../../service/asset-dashboard.service';
import { useInventoryStore } from '../../store/inventoryStore';

interface ProfilePageProps {
  onOpenDashboard: () => void;
  onOpenShare: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenDashboard, onOpenShare }) => {
  const [subject, setSubject] = useState('');
  const items = useInventoryStore((state) => state.items);
  const stats = calculateAssetDashboard(items);

  return (
    <div className="page-stack profile-page">
      <header className="theme-title">
        <img src={ornamentShell} alt="" aria-hidden="true" />
        <h1>主题风格</h1>
      </header>

      <section className="theme-showcase-card">
        <div className="theme-selected-mark">✓</div>
        <img src={themeWaterTheater} alt="水蓝剧场主题预览" />
        <div className="theme-copy">
          <h2>水蓝剧场</h2>
          <img src={iconProfileCrown} alt="" aria-hidden="true" />
        </div>
      </section>

      <section className="theme-generator-card">
        <label className="field-label">
          输入喜欢的IP / 人物
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="例如：芙宁娜"
          />
        </label>
        <button type="button" className="primary-button ornate-button">
          生成我的风格
        </button>
      </section>

      <section className="theme-more">
        <div className="divider-title">更多主题</div>
        <div className="theme-thumb-row">
          <button type="button" className="theme-thumb active">
            <img src={themeWaterThumb} alt="" aria-hidden="true" />
            <span>水蓝剧场</span>
          </button>
          <button type="button" className="theme-thumb">
            <img src={themeCreamThumb} alt="" aria-hidden="true" />
            <span>奶油手账</span>
          </button>
          <button type="button" className="theme-thumb">
            <img src={themeMintThumb} alt="" aria-hidden="true" />
            <span>薄荷收纳</span>
          </button>
        </div>
      </section>

      <section className="asset-mini-card profile-asset-row">
        <div>
          <span>资产</span>
          <strong>{stats.marketPriceTotal.toFixed(2)}</strong>
        </div>
        <div>
          <span>总数</span>
          <strong>{stats.itemCount}件</strong>
        </div>
      </section>

      <section className="tool-grid">
        <button type="button" onClick={onOpenDashboard}>资产统计</button>
        <button type="button" onClick={onOpenShare}>分享预览</button>
        <button type="button">数据导出</button>
        <button type="button">提醒通知</button>
      </section>
    </div>
  );
};

export default ProfilePage;
