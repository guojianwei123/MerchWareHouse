import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DynamicGuziForm } from '../../components/Forms/DynamicGuziForm';
import { SecondaryPage } from '../../components/SecondaryPage';
import { buildGuziCategoryContext } from '../../config/categories';
import { api, fileToLocalImageInput } from '../../service/api.service';
import { useCategoryStore } from '../../store/categoryStore';
import { useInventoryStore } from '../../store/inventoryStore';
import type { GuziItem } from '../../types/models/guzi.schema';
import { LOCAL_IMAGE_ACCEPT } from '../../types/models/local-image.schema';
import { mapWithConcurrencySettled } from '../../utils/concurrency';
import heroCameraShell from '../../assets/aqua-opera/hero-camera-shell.png';
import iconBatchBox from '../../assets/aqua-opera/icon-batch-box.png';
import iconLinkChain from '../../assets/aqua-opera/icon-link-chain.png';
import iconManualFeather from '../../assets/aqua-opera/icon-manual-feather.png';
import ornamentShell from '../../assets/aqua-opera/ornament-shell.png';

type EntryMode = 'ai' | 'link' | 'batch';
type UploadView = 'main' | 'manual' | 'linkForm';
const BATCH_IMPORT_CONCURRENCY = 3;

interface MainViewSnapshot {
  mode: EntryMode;
  linkUrl: string;
  linkFormOpen: boolean;
  batchFiles: File[];
  isEntryOptionsCollapsed: boolean;
}

interface UploadPageProps {
  onDraftReady: () => void;
  onSecondaryChange?: (active: boolean) => void;
}

const isValidUrl = (value: string): boolean => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

export const UploadPage: React.FC<UploadPageProps> = ({ onDraftReady, onSecondaryChange }) => {
  const [view, setView] = useState<UploadView>('main');
  const [mode, setMode] = useState<EntryMode>('ai');
  const [linkUrl, setLinkUrl] = useState('');
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [isEntryOptionsCollapsed, setIsEntryOptionsCollapsed] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mainViewSnapshotRef = useRef<MainViewSnapshot | null>(null);
  const fileDialogPendingRef = useRef(false);
  const fileDialogRestoreCollapsedRef = useRef<boolean | null>(null);
  const customCategories = useCategoryStore((state) => state.categories);
  const setDraftItem = useInventoryStore((state) => state.setDraftItem);
  const setDraftQueue = useInventoryStore((state) => state.setDraftQueue);
  const categoryContext = useMemo(() => buildGuziCategoryContext(customCategories), [customCategories]);

  useEffect(() => {
    onSecondaryChange?.(view !== 'main');

    return () => onSecondaryChange?.(false);
  }, [onSecondaryChange, view]);

  const createDraft = (item: GuziItem) => {
    setDraftItem(item);
    onDraftReady();
  };

  const restoreAfterImageSelection = () => {
    const restoreCollapsed = fileDialogRestoreCollapsedRef.current;

    if (restoreCollapsed !== null) {
      setIsEntryOptionsCollapsed(restoreCollapsed);
    }

    fileDialogRestoreCollapsedRef.current = null;
  };

  const handleChooseImageClick = () => {
    setError(null);
    setNotice(null);

    fileDialogPendingRef.current = true;
    fileDialogRestoreCollapsedRef.current = isEntryOptionsCollapsed;
    setIsEntryOptionsCollapsed(true);

    window.addEventListener(
      'focus',
      () => {
        window.setTimeout(() => {
          if (fileDialogPendingRef.current) {
            fileDialogPendingRef.current = false;
            restoreAfterImageSelection();
          }
        }, 250);
      },
      { once: true },
    );

    imageInputRef.current?.click();
  };

  const handleImageSelect = async (files: FileList | null) => {
    setError(null);
    setNotice(null);
    fileDialogPendingRef.current = false;

    const file = files?.[0];

    if (!file) {
      restoreAfterImageSelection();
      return;
    }

    setIsProcessing(true);

    try {
      const image = await fileToLocalImageInput(file);
      const drafts = await api.extractGuziDraftFromLocalImage(image, categoryContext);

      if (drafts.length === 0) {
        throw new Error('未从 OCR 文本中识别到可入库谷子');
      }

      setDraftQueue(drafts);
      onDraftReady();
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败');
      restoreAfterImageSelection();
    } finally {
      setIsProcessing(false);
      fileDialogRestoreCollapsedRef.current = null;
    }
  };

  const handleLinkParse = async () => {
    setError(null);
    setNotice(null);

    if (!isValidUrl(linkUrl)) {
      setError('请输入有效的商品链接。');
      setLinkFormOpen(false);
      return;
    }

    setIsProcessing(true);

    try {
      const parsed = await api.parseLink(linkUrl);
      setNotice(parsed.title ? `已读取页面：${parsed.title}` : '链接有效，请补齐字段。');
      setLinkFormOpen(true);
      setView('linkForm');
    } catch (err) {
      setError(err instanceof Error ? err.message : '链接解析失败，请手动补齐字段。');
      setLinkFormOpen(true);
      setView('linkForm');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchImport = async () => {
    setError(null);
    setNotice(null);

    if (batchFiles.length === 0) {
      setError('请选择至少一张图片。');
      return;
    }

    setIsProcessing(true);
    const failures: string[] = [];
    const drafts: GuziItem[] = [];

    const results = await mapWithConcurrencySettled(
      batchFiles,
      BATCH_IMPORT_CONCURRENCY,
      async (file) => {
        const image = await fileToLocalImageInput(file);
        return api.extractGuziDraftFromLocalImage(image, categoryContext);
      },
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        drafts.push(...result.value);
      } else {
        const message = result.reason instanceof Error ? result.reason.message : '识别失败';
        failures.push(`第 ${result.index + 1} 行：${message}`);
      }
    }

    setIsProcessing(false);
    setNotice(`已生成 ${drafts.length} 件待确认草稿。`);
    setError(failures.length > 0 ? failures.join('；') : null);

    if (drafts.length > 0) {
      setDraftQueue(drafts);
      onDraftReady();
    }
  };

  const handleOpenManual = () => {
    mainViewSnapshotRef.current = {
      mode,
      linkUrl,
      linkFormOpen,
      batchFiles,
      isEntryOptionsCollapsed,
    };
    setError(null);
    setNotice(null);
    setView('manual');
  };

  const handleBackFromManual = () => {
    const snapshot = mainViewSnapshotRef.current;

    if (snapshot) {
      setMode(snapshot.mode);
      setLinkUrl(snapshot.linkUrl);
      setLinkFormOpen(snapshot.linkFormOpen);
      setBatchFiles(snapshot.batchFiles);
      setIsEntryOptionsCollapsed(snapshot.isEntryOptionsCollapsed);
    }

    setView('main');
  };

  if (view === 'manual') {
    return (
      <SecondaryPage title="手动录入" onBack={handleBackFromManual} className="upload-page manual-entry-page">
        <section className="form-panel manual-entry-panel">
          <DynamicGuziForm mode="create" onSubmit={createDraft} />
        </section>
      </SecondaryPage>
    );
  }

  if (view === 'linkForm') {
    return (
      <SecondaryPage title="链接补齐" onBack={() => setView('main')} className="upload-page manual-entry-page">
        <section className="form-panel manual-entry-panel">
          <DynamicGuziForm
            mode="create"
            sourceUrl={linkUrl}
            onSubmit={createDraft}
            onCancel={() => setView('main')}
          />
        </section>
      </SecondaryPage>
    );
  }

  return (
    <div className="page-stack upload-page">
      <header className="upload-title">
        <img src={ornamentShell} alt="" aria-hidden="true" />
        <h1>今天收了什么谷？</h1>
      </header>

      <section className="ai-entry-card opera-panel">
        <div className="ai-hero-art">
          <img src={heroCameraShell} alt="" aria-hidden="true" />
        </div>
        <div className="ai-entry-copy">
          <span className="eyebrow">AI 录入</span>
          <h2>识别小票 / 订单 / 谷子图片</h2>
          <p>从本地设备选择图片后生成待确认草稿。</p>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept={LOCAL_IMAGE_ACCEPT}
          hidden
          onChange={(event) => {
            void handleImageSelect(event.target.files);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="primary-button ornate-button"
          onClick={handleChooseImageClick}
          disabled={isProcessing}
        >
          {isProcessing ? '识别中' : '选择图片识别'}
        </button>
      </section>

      {isEntryOptionsCollapsed ? (
        <button
          type="button"
          className="link-button upload-collapse-toggle"
          onClick={() => setIsEntryOptionsCollapsed(false)}
        >
          展开其他录入方式
        </button>
      ) : (
        <>
          <section className="action-grid entry-mode-grid">
            <button type="button" onClick={handleOpenManual}>
              <img src={iconManualFeather} alt="" aria-hidden="true" />
              <span>手动录入</span>
            </button>
            <button type="button" className={mode === 'link' ? 'active' : ''} onClick={() => setMode('link')}>
              <img src={iconLinkChain} alt="" aria-hidden="true" />
              <span>链接解析</span>
            </button>
            <button type="button" className={mode === 'batch' ? 'active' : ''} onClick={() => setMode('batch')}>
              <img src={iconBatchBox} alt="" aria-hidden="true" />
              <span>批量导入</span>
            </button>
          </section>

          {mode === 'link' ? (
            <section className="form-panel">
              <label className="field-label">
                商品链接
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(event) => {
                    setLinkUrl(event.target.value);
                    setLinkFormOpen(false);
                  }}
                  placeholder="https://example.com/item"
                />
              </label>
              <button type="button" className="primary-button" onClick={handleLinkParse}>
                校验链接并补齐字段
              </button>
              {linkFormOpen ? (
                <button type="button" onClick={() => setView('linkForm')}>
                  继续补齐字段
                </button>
              ) : null}
            </section>
          ) : null}

          {mode === 'batch' ? (
            <section className="form-panel">
              <label className="field-label">
                本地图片
                <input
                  type="file"
                  accept={LOCAL_IMAGE_ACCEPT}
                  multiple
                  onChange={(event) => setBatchFiles(Array.from(event.target.files ?? []))}
                />
              </label>
              {batchFiles.length > 0 ? <p className="inline-note">已选择 {batchFiles.length} 张图片。</p> : null}
              <button type="button" className="primary-button" onClick={handleBatchImport} disabled={isProcessing}>
                {isProcessing ? '批量识别中' : '开始批量导入'}
              </button>
            </section>
          ) : null}
        </>
      )}

      {notice ? <p className="inline-note">{notice}</p> : null}
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}
    </div>
  );
};

export default UploadPage;
