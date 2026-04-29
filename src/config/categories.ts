import type { CategoryTone } from '../types/models/category.schema';
import type { GuziType } from '../types/models/guzi.schema';

export const LOCAL_OWNER_ID = 'local-user';
export const UNKNOWN_GUIZI_CATEGORY = '未知品类';

export interface GuziCategoryContext {
  value: string;
  label: string;
}

export const fixedGuziCategories: Array<{ value: GuziType; label: string; tone: CategoryTone; icon: string }> = [
  { value: 'badge', label: '吧唧', tone: 'pink', icon: '◎' },
  { value: 'paper_card', label: '纸片', tone: 'blue', icon: '▱' },
  { value: 'acrylic', label: '亚克力', tone: 'mint', icon: '▵' },
  { value: 'figure', label: '手办', tone: 'gold', icon: '♙' },
  { value: 'fabric', label: '布艺', tone: 'blue', icon: '◒' },
  { value: 'practical', label: '实用', tone: 'mint', icon: '◈' },
  { value: 'special', label: '特殊', tone: 'pink', icon: '✦' },
];

export const categoryToneOptions: Array<{ value: CategoryTone; label: string }> = [
  { value: 'pink', label: '樱粉' },
  { value: 'blue', label: '水蓝' },
  { value: 'mint', label: '薄荷' },
  { value: 'gold', label: '金色' },
];

export const isFixedGuziCategory = (type: string): boolean => fixedGuziCategories.some((category) => category.value === type);

export const getGuziCategoryLabel = (type: string): string => {
  return fixedGuziCategories.find((category) => category.value === type)?.label ?? type;
};

export const buildGuziCategoryContext = (customCategories: Array<{ name: string }>): GuziCategoryContext[] => {
  const seen = new Set<string>();

  return [
    ...fixedGuziCategories.map((category) => ({ value: category.value, label: category.label })),
    ...customCategories.map((category) => ({ value: category.name, label: category.name })),
  ].reduce<GuziCategoryContext[]>((categories, category) => {
    const value = category.value.trim();
    const label = category.label.trim();

    if (!value || seen.has(value)) {
      return categories;
    }

    seen.add(value);
    categories.push({ value, label: label || value });
    return categories;
  }, []);
};
