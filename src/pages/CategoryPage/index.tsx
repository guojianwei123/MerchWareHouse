import React, { useEffect, useMemo, useState } from 'react';
import {
  categoryToneOptions,
  fixedGuziCategories,
  isFixedGuziCategory,
} from '../../config/categories';
import { api } from '../../service/api.service';
import { useCategoryStore } from '../../store/categoryStore';
import { useInventoryStore } from '../../store/inventoryStore';
import type { Category, CategoryTone } from '../../types/models/category.schema';

const inventoryOnlyCategoryTone: CategoryTone = 'blue';

export const CategoryPage: React.FC = () => {
  const items = useInventoryStore((state) => state.items);
  const setItems = useInventoryStore((state) => state.setItems);
  const customCategories = useCategoryStore((state) => state.categories);
  const setCategories = useCategoryStore((state) => state.setCategories);
  const addCategory = useCategoryStore((state) => state.addCategory);
  const updateCategory = useCategoryStore((state) => state.updateCategory);
  const removeCategory = useCategoryStore((state) => state.removeCategory);
  const [newName, setNewName] = useState('');
  const [newTone, setNewTone] = useState<CategoryTone>('pink');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.listCategories()
      .then(setCategories)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '品类加载失败');
      });
    api.listItems()
      .then(setItems)
      .catch(() => undefined);
  }, [setCategories, setItems]);

  const countByType = useMemo(() => {
    return items.reduce((counts, item) => {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
  }, [items]);

  const inventoryOnlyCategories = useMemo(() => {
    const customNames = new Set(customCategories.map((category) => category.name));

    return Array.from(countByType.keys())
      .filter((type) => !isFixedGuziCategory(type) && !customNames.has(type))
      .map((type): Category => ({
        id: `inventory_${type}`,
        ownerId: 'inventory-only',
        name: type,
        tone: inventoryOnlyCategoryTone,
      }));
  }, [countByType, customCategories]);

  const createCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();

    if (!name) {
      setError('请填写自定义品类名称。');
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const category = await api.createCategory({ name, tone: newTone });
      addCategory(category);
      setNewName('');
      setNotice(`已创建自定义品类：${category.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建品类失败');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (category: Category) => {
    setError(null);
    setNotice(null);
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const renameCategory = async (category: Category) => {
    const name = editingName.trim();

    if (!name) {
      setError('请填写自定义品类名称。');
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const updated = await api.updateCategory(category.id, { name });
      updateCategory(updated);
      setEditingId(null);
      setEditingName('');
      setNotice(`已更新自定义品类：${updated.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新品类失败');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (category: Category) => {
    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      await api.deleteCategory(category.id);
      removeCategory(category.id);
      setNotice(`已删除自定义品类：${category.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除品类失败');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCustomCategory = (category: Category, persisted: boolean) => {
    const count = countByType.get(category.name) ?? 0;
    const isEditing = editingId === category.id;
    const canMutate = persisted && count === 0;

    return (
      <article key={category.id} className={`folder-card ${category.tone} ${persisted ? '' : 'inventory-only'}`}>
        <span className="folder-icon">#</span>
        {isEditing ? (
          <div className="category-inline-form">
            <input value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={40} />
            <button type="button" className="primary-button" onClick={() => renameCategory(category)} disabled={isSaving}>
              保存
            </button>
            <button type="button" onClick={() => setEditingId(null)} disabled={isSaving}>
              取消
            </button>
          </div>
        ) : (
          <>
            <h2>{category.name}</h2>
            <p>{count} 件已启用</p>
            <small className="category-card-meta">{persisted ? '自定义' : '库存已有'}</small>
            {persisted ? (
              <div className="category-card-actions">
                <button type="button" onClick={() => startEditing(category)} disabled={!canMutate || isSaving}>
                  编辑
                </button>
                <button type="button" onClick={() => deleteCategory(category)} disabled={!canMutate || isSaving}>
                  删除
                </button>
              </div>
            ) : null}
          </>
        )}
      </article>
    );
  };

  return (
    <div className="page-stack category-page">
      <header className="page-hero compact">
        <span className="eyebrow">品类</span>
        <h1>收纳册管理</h1>
        <p>每一种谷子都有自己的收纳位。</p>
      </header>

      <section className="folder-grid">
        <form className="folder-card create category-create-card" onSubmit={createCategory}>
          <span className="folder-icon">+</span>
          <h2>自定义品类</h2>
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="例如：票根" maxLength={40} />
          <select value={newTone} onChange={(event) => setNewTone(event.target.value as CategoryTone)}>
            {categoryToneOptions.map((tone) => (
              <option key={tone.value} value={tone.value}>
                {tone.label}
              </option>
            ))}
          </select>
          <button type="submit" className="primary-button" disabled={isSaving || !newName.trim()}>
            创建
          </button>
        </form>

        {fixedGuziCategories.map((category) => {
          const count = countByType.get(category.value) ?? 0;

          return (
            <article key={category.value} className={`folder-card ${category.tone}`}>
              <span className="folder-icon">{category.icon}</span>
              <h2>{category.label}</h2>
              <p>{count} 件已启用</p>
              <small className="category-card-meta">固定分类</small>
            </article>
          );
        })}

        {customCategories.map((category) => renderCustomCategory(category, true))}
        {inventoryOnlyCategories.map((category) => renderCustomCategory(category, false))}
      </section>

      {notice ? <p className="inline-note">{notice}</p> : null}
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}
    </div>
  );
};

export default CategoryPage;
