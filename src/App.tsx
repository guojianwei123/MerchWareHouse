import React, { useState } from 'react';
import AssetDashboardPage from './pages/AssetDashboardPage';
import CategoryPage from './pages/CategoryPage';
import DraftReviewPage from './pages/DraftReviewPage';
import ItemsPage from './pages/ItemsPage';
import ProfilePage from './pages/ProfilePage';
import RoomEditorPage from './pages/RoomEditorPage';
import ShowcaseSharePage from './pages/ShowcaseSharePage';
import UploadPage from './pages/UploadPage';
import iconCategoryTicket from './assets/aqua-opera/icon-category-ticket.png';
import iconItemStar from './assets/aqua-opera/icon-item-star.png';
import iconProfileCrown from './assets/aqua-opera/icon-profile-crown.png';
import iconRoomCabinet from './assets/aqua-opera/icon-room-cabinet.png';
import themeWaterThumb from './assets/aqua-opera/theme-water-thumb.png';
import './styles.css';

type PageKey = 'room' | 'items' | 'upload' | 'draft' | 'category' | 'profile' | 'dashboard' | 'share';

const tabs: Array<{ key: PageKey; label: string; icon: string; image?: string }> = [
  { key: 'room', label: '房间', icon: '⌂', image: iconRoomCabinet },
  { key: 'items', label: '物品', icon: '◇', image: iconItemStar },
  { key: 'upload', label: '录入', icon: '+', image: themeWaterThumb },
  { key: 'category', label: '品类', icon: '▦', image: iconCategoryTicket },
  { key: 'profile', label: '我的', icon: '◌', image: iconProfileCrown },
];

export const App: React.FC = () => {
  const [page, setPage] = useState<PageKey>('room');

  return (
    <main className="app-shell theme-aqua-opera">
      <div className="phone-frame">
        <section className="app-content">
          {page === 'room' ? <RoomEditorPage /> : null}
          {page === 'items' ? <ItemsPage /> : null}
          {page === 'upload' ? <UploadPage onDraftReady={() => setPage('draft')} /> : null}
          {page === 'draft' ? <DraftReviewPage onDone={(target) => setPage(target)} /> : null}
          {page === 'category' ? <CategoryPage /> : null}
          {page === 'profile' ? <ProfilePage onOpenDashboard={() => setPage('dashboard')} onOpenShare={() => setPage('share')} /> : null}
          {page === 'dashboard' ? <AssetDashboardPage /> : null}
          {page === 'share' ? <ShowcaseSharePage /> : null}
        </section>
        <nav className="bottom-nav" aria-label="主导航">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${page === item.key ? 'active' : ''} ${item.key === 'upload' ? 'primary' : ''}`}
              onClick={() => setPage(item.key)}
              aria-label={item.label}
            >
              <span className="nav-icon">
                {item.image ? <img src={item.image} alt="" aria-hidden="true" /> : item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
};

export default App;
