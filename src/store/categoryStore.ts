import { create } from 'zustand';
import { isFixedGuziCategory, UNKNOWN_GUIZI_CATEGORY } from '../config/categories';
import type { Category } from '../types/models/category.schema';

interface CategoryState {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  addLocalCategoryName: (name: string) => void;
  updateCategory: (category: Category) => void;
  removeCategory: (id: string) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
  addLocalCategoryName: (name) =>
    set((state) => {
      const trimmed = name.trim();

      if (
        !trimmed ||
        trimmed === UNKNOWN_GUIZI_CATEGORY ||
        isFixedGuziCategory(trimmed) ||
        state.categories.some((category) => category.name === trimmed)
      ) {
        return state;
      }

      return {
        categories: [
          ...state.categories,
          {
            id: `local_category_${trimmed}`,
            ownerId: 'local-user',
            name: trimmed,
            tone: 'blue',
          },
        ],
      };
    }),
  updateCategory: (category) =>
    set((state) => ({
      categories: state.categories.map((current) => (current.id === category.id ? category : current)),
    })),
  removeCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((category) => category.id !== id),
    })),
}));
