import React, { useEffect, useState } from 'react';
import AIPage from './pages/AIPage';
import AssetDashboardPage from './pages/AssetDashboardPage';
import CategoryPage from './pages/CategoryPage';
import DraftReviewPage from './pages/DraftReviewPage';
import ItemsPage from './pages/ItemsPage';
import ProfilePage from './pages/ProfilePage';
import RoomEditorPage from './pages/RoomEditorPage';
import ShowcaseSharePage from './pages/ShowcaseSharePage';
import UploadPage from './pages/UploadPage';
import { api } from './service/api.service';
import { useAuthStore } from './store/authStore';
import { useCategoryStore } from './store/categoryStore';
import { useInventoryStore } from './store/inventoryStore';
import iconCategoryTicket from './assets/aqua-opera/icon-category-ticket.png';
import iconItemStar from './assets/aqua-opera/icon-item-star.png';
import iconProfileCrown from './assets/aqua-opera/icon-profile-crown.png';
import iconRoomCabinet from './assets/aqua-opera/icon-room-cabinet.png';
import themeWaterThumb from './assets/aqua-opera/theme-water-thumb.png';
import './styles.css';

type PageKey = 'room' | 'items' | 'upload' | 'ai' | 'draft' | 'category' | 'profile' | 'dashboard' | 'share';
type ThemeKey = 'theme-aqua-opera' | 'theme-cream-desk' | 'theme-mint-cabinet' | 'theme-ai';

const tabs: Array<{ key: PageKey; label: string; icon: string; image?: string }> = [
  { key: 'room', label: '房间', icon: '⌂', image: iconRoomCabinet },
  { key: 'items', label: '物品', icon: '◇', image: iconItemStar },
  { key: 'upload', label: '录入', icon: '+', image: themeWaterThumb },
  { key: 'category', label: '品类', icon: '▦', image: iconCategoryTicket },
  { key: 'profile', label: '我的', icon: '◌', image: iconProfileCrown },
];

const getInitialPage = (): PageKey => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('page') === 'share' || params.has('showcase')) {
    return 'share';
  }

  return 'room';
};

export const App: React.FC = () => {
  const [page, setPage] = useState<PageKey>(() => getInitialPage());
  const [themeKey, setThemeKey] = useState<ThemeKey>('theme-aqua-opera');
  const [themeTokens, setThemeTokens] = useState<Record<string, string>>({});
  const [isSecondaryActive, setIsSecondaryActive] = useState(false);
  const authStatus = useAuthStore((state) => state.status);
  const login = useAuthStore((state) => state.login);
  const setCategories = useCategoryStore((state) => state.setCategories);
  const setItems = useInventoryStore((state) => state.setItems);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (authStatus === 'loading') {
        return;
      }

      const user = authStatus === 'authenticated' ? useAuthStore.getState().user : await login();

      if (!isMounted || !user) {
        return;
      }

      const [categories, items] = await Promise.all([
        api.listCategories(),
        api.listItems(),
      ]);

      if (isMounted) {
        setCategories(categories);
        setItems(items);
      }
    };

    void bootstrap().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [authStatus, login, setCategories, setItems]);

  const navigate = (nextPage: PageKey) => {
    setIsSecondaryActive(false);
    setPage(nextPage);
  };
  const isAiEntryVisible = page !== 'ai' && page !== 'draft' && !isSecondaryActive;

  return (
    <main className={`app-shell ${themeKey}`} style={themeTokens as React.CSSProperties}>
      <div className="phone-frame">
        {isAiEntryVisible ? (
          <button
            type="button"
            className="ai-corner-button"
            onClick={() => navigate('ai')}
            aria-label="AI 助手"
          >
            AI
          </button>
        ) : null}
        <section className={`app-content ${isAiEntryVisible ? 'with-ai-entry' : ''}`}>
          {page === 'room' ? <RoomEditorPage onSecondaryChange={setIsSecondaryActive} /> : null}
          {page === 'items' ? <ItemsPage onSecondaryChange={setIsSecondaryActive} /> : null}
          {page === 'upload' ? (
            <UploadPage onDraftReady={() => navigate('draft')} onSecondaryChange={setIsSecondaryActive} />
          ) : null}
          {page === 'ai' ? <AIPage onDraftReady={() => navigate('draft')} /> : null}
          {page === 'draft' ? <DraftReviewPage onDone={(target) => navigate(target)} /> : null}
          {page === 'category' ? <CategoryPage /> : null}
          {page === 'profile' ? (
            <ProfilePage
              activeTheme={themeKey}
              onOpenDashboard={() => navigate('dashboard')}
              onOpenShare={() => navigate('share')}
              onThemeChange={(nextTheme, tokens = {}) => {
                setThemeKey(nextTheme);
                setThemeTokens(tokens);
              }}
            />
          ) : null}
          {page === 'dashboard' ? <AssetDashboardPage /> : null}
          {page === 'share' ? <ShowcaseSharePage /> : null}
        </section>
        <nav className={`bottom-nav ${isSecondaryActive || page === 'draft' ? 'hidden' : ''}`} aria-label="主导航">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${page === item.key ? 'active' : ''} ${item.key === 'upload' ? 'primary' : ''}`}
              onClick={() => navigate(item.key)}
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
