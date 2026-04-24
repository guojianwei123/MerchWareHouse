import React, { useState } from 'react';
import { MockVisionAdapter } from '../../adapters/llm/vision.adapter';
import { DynamicGuziForm } from '../../components/Forms/DynamicGuziForm';
import { IngestionService } from '../../service/ingestion.service';
import { useInventoryStore } from '../../store/inventoryStore';
import type { GuziItem } from '../../types/models/guzi.schema';
import heroCameraShell from '../../assets/aqua-opera/hero-camera-shell.png';
import iconBatchBox from '../../assets/aqua-opera/icon-batch-box.png';
import iconLinkChain from '../../assets/aqua-opera/icon-link-chain.png';
import iconManualFeather from '../../assets/aqua-opera/icon-manual-feather.png';
import ornamentShell from '../../assets/aqua-opera/ornament-shell.png';

const ingestionService = new IngestionService(new MockVisionAdapter());

type EntryMode = 'ai' | 'manual' | 'link' | 'batch';

interface UploadPageProps {
  onDraftReady: () => void;
}

const isValidUrl = (value: string): boolean => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

export const UploadPage: React.FC<UploadPageProps> = ({ onDraftReady }) => {
  const [mode, setMode] = useState<EntryMode>('ai');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const setDraftItem = useInventoryStore((state) => state.setDraftItem);
  const addItem = useInventoryStore((state) => state.addItem);

  const createDraft = (item: GuziItem) => {
    setDraftItem(item);
    onDraftReady();
  };

  const handleUpload = async () => {
    setError(null);
    setNotice(null);

    if (!isValidUrl(imageUrl)) {
      setError('请输入有效的图片 URL。');
      return;
    }

    setIsProcessing(true);

    try {
      const draft = await ingestionService.processScreenshot(imageUrl);
      createDraft(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkParse = () => {
    setError(null);
    setNotice(null);

    if (!isValidUrl(linkUrl)) {
      setError('请输入有效的商品链接。');
      setLinkFormOpen(false);
      return;
    }

    setLinkFormOpen(true);
  };

  const handleBatchImport = async () => {
    setError(null);
    setNotice(null);

    const urls = batchUrls
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setError('请粘贴至少一行图片 URL。');
      return;
    }

    const invalidIndex = urls.findIndex((url) => !isValidUrl(url));

    if (invalidIndex >= 0) {
      setError(`第 ${invalidIndex + 1} 行不是有效 URL。`);
      return;
    }

    setIsProcessing(true);
    const failures: string[] = [];
    let importedCount = 0;

    for (const [index, url] of urls.entries()) {
      try {
        const item = await ingestionService.processScreenshot(url);
        addItem(item);
        importedCount += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : '识别失败';
        failures.push(`第 ${index + 1} 行：${message}`);
      }
    }

    setIsProcessing(false);
    setNotice(`已入库 ${importedCount} 件。`);
    setError(failures.length > 0 ? failures.join('；') : null);
  };

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
          <p>上传图片 URL 后生成待确认草稿。</p>
        </div>
        <button type="button" className="primary-button ornate-button" onClick={handleUpload} disabled={isProcessing}>
          {isProcessing && mode === 'ai' ? '识别中' : '上传图片识别'}
        </button>
      </section>

      <button type="button" className="link-button advanced-toggle" onClick={() => setAdvancedOpen((open) => !open)}>
        {advancedOpen ? '收起高级输入 URL' : '高级输入 URL'}
      </button>
      {advancedOpen ? (
        <section className="advanced-panel">
          <label className="field-label">
            图片 URL
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://example.com/order.jpg"
            />
          </label>
        </section>
      ) : null}

      <section className="action-grid entry-mode-grid">
        <button type="button" className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
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

      {mode === 'manual' ? (
        <section className="form-panel">
          <DynamicGuziForm mode="create" onSubmit={createDraft} />
        </section>
      ) : null}

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
          {linkFormOpen ? <DynamicGuziForm mode="create" sourceUrl={linkUrl} onSubmit={createDraft} /> : null}
        </section>
      ) : null}

      {mode === 'batch' ? (
        <section className="form-panel">
          <label className="field-label">
            多行图片 URL
            <textarea
              value={batchUrls}
              onChange={(event) => setBatchUrls(event.target.value)}
              placeholder={'https://example.com/one.jpg\nhttps://example.com/two.jpg'}
              rows={5}
            />
          </label>
          <button type="button" className="primary-button" onClick={handleBatchImport} disabled={isProcessing}>
            {isProcessing ? '批量识别中' : '开始批量导入'}
          </button>
        </section>
      ) : null}

      {notice ? <p className="inline-note">{notice}</p> : null}
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}
    </div>
  );
};

export default UploadPage;
