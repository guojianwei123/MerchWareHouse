import React, { useState } from 'react';
import iconProfileCrown from '../../assets/aqua-opera/icon-profile-crown.png';
import ornamentShell from '../../assets/aqua-opera/ornament-shell.png';
import themeCreamThumb from '../../assets/aqua-opera/theme-cream-thumb.png';
import themeMintThumb from '../../assets/aqua-opera/theme-mint-thumb.png';
import themeWaterTheater from '../../assets/aqua-opera/theme-water-theater.png';
import themeWaterThumb from '../../assets/aqua-opera/theme-water-thumb.png';
import { calculateAssetDashboard } from '../../service/asset-dashboard.service';
import { api } from '../../service/api.service';
import { useInventoryStore } from '../../store/inventoryStore';

type ThemeKey = 'theme-aqua-opera' | 'theme-cream-desk' | 'theme-mint-cabinet' | 'theme-ai';

interface ProfilePageProps {
  activeTheme: ThemeKey;
  onOpenDashboard: () => void;
  onOpenShare: () => void;
  onThemeChange: (theme: ThemeKey, tokens?: Record<string, string>) => void;
}

const themeOptions: Array<{ key: ThemeKey; label: string; image: string }> = [
  { key: 'theme-aqua-opera', label: '水蓝剧场', image: themeWaterThumb },
  { key: 'theme-cream-desk', label: '奶油手账', image: themeCreamThumb },
  { key: 'theme-mint-cabinet', label: '薄荷收纳', image: themeMintThumb },
];

export const ProfilePage: React.FC<ProfilePageProps> = ({
  activeTheme,
  onOpenDashboard,
  onOpenShare,
  onThemeChange,
}) => {
  const [subject, setSubject] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = useInventoryStore((state) => state.items);
  const stats = calculateAssetDashboard(items);

  const generateTheme = async () => {
    setError(null);
    setNotice(null);

    try {
      const theme = await api.generateTheme(subject);
      onThemeChange('theme-ai', theme.tokens);
      setNotice(`已生成 ${subject} 风格 token。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '主题生成失败');
    }
  };

  const exportData = async () => {
    setError(null);
    setNotice(null);

    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `guozi-warehouse-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice('数据导出已生成。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据导出失败');
    }
  };

  const saveReminder = async () => {
    setError(null);
    setNotice(null);

    try {
      const remindAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await api.saveReminder({ enabled: true, message: '记得整理新入库谷子', remindAt });
      setNotice('已开启整理提醒。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提醒设置失败');
    }
  };

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
        <button type="button" className="primary-button ornate-button" onClick={generateTheme} disabled={!subject.trim()}>
          生成我的风格
        </button>
      </section>

      <section className="theme-more">
        <div className="divider-title">更多主题</div>
        <div className="theme-thumb-row">
          {themeOptions.map((theme) => (
            <button
              key={theme.key}
              type="button"
              className={`theme-thumb ${activeTheme === theme.key ? 'active' : ''}`}
              onClick={() => onThemeChange(theme.key)}
            >
              <img src={theme.image} alt="" aria-hidden="true" />
              <span>{theme.label}</span>
            </button>
          ))}
        </div>
      </section>

      {notice ? <p className="inline-note">{notice}</p> : null}
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}

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
        <button type="button" onClick={exportData}>数据导出</button>
        <button type="button" onClick={saveReminder}>提醒通知</button>
      </section>
    </div>
  );
};

export default ProfilePage;
