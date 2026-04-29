import React, { useMemo, useRef, useState } from 'react';
import ornamentShell from '../../assets/aqua-opera/ornament-shell.png';
import { buildGuziCategoryContext } from '../../config/categories';
import { api, fileToLocalImageInput } from '../../service/api.service';
import { useCategoryStore } from '../../store/categoryStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { LOCAL_IMAGE_ACCEPT } from '../../types/models/local-image.schema';

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

interface AIPageProps {
  onDraftReady: () => void;
}

const createMessage = (role: AiMessage['role'], content: string): AiMessage => ({
  id: `ai_message_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  role,
  content,
});

export const AIPage: React.FC<AIPageProps> = ({ onDraftReady }) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    createMessage('assistant', '可以问我谷子术语、品类区别、收纳建议，也可以上传图片识别谷子草稿。'),
  ]);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDrafts, setHasDrafts] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const customCategories = useCategoryStore((state) => state.categories);
  const setDraftQueue = useInventoryStore((state) => state.setDraftQueue);
  const categoryContext = useMemo(() => buildGuziCategoryContext(customCategories), [customCategories]);

  const appendMessages = (...nextMessages: AiMessage[]) => {
    setMessages((current) => [...current, ...nextMessages]);
  };

  const handleSend = async () => {
    const trimmed = message.trim();

    if (!trimmed) {
      return;
    }

    setError(null);
    setHasDrafts(false);
    setMessage('');
    setIsProcessing(true);
    appendMessages(createMessage('user', trimmed));

    try {
      const response = await api.chatWithAi({ message: trimmed });
      appendMessages(createMessage('assistant', response.reply));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 对话失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageSelect = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      return;
    }

    const prompt = message.trim() || '请识别这张谷子图片';

    setError(null);
    setHasDrafts(false);
    setMessage('');
    setIsProcessing(true);
    appendMessages(createMessage('user', `上传图片：${file.name}`));

    try {
      const image = await fileToLocalImageInput(file);
      const response = await api.chatWithAi({ message: prompt, imageUrl: image.dataUrl, categories: categoryContext });

      appendMessages(createMessage('assistant', response.reply));

      if (response.drafts && response.drafts.length > 0) {
        setDraftQueue(response.drafts);
        setHasDrafts(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片识别失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-stack ai-page">
      <header className="ai-title">
        <img src={ornamentShell} alt="" aria-hidden="true" />
        <div>
          <span className="eyebrow">AI</span>
          <h1>问问谷子助手</h1>
        </div>
      </header>

      <section className="ai-chat-panel">
        {messages.map((item) => (
          <article key={item.id} className={`ai-message ${item.role}`}>
            <span>{item.role === 'user' ? '我' : 'AI'}</span>
            <p>{item.content}</p>
          </article>
        ))}
      </section>

      {hasDrafts ? (
        <button type="button" className="primary-button ornate-button" onClick={onDraftReady}>
          进入草稿确认
        </button>
      ) : null}

      <section className="ai-compose-panel">
        <label className="field-label">
          想了解什么？
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="例如：吧唧和纸片怎么收纳？"
            maxLength={1000}
          />
        </label>
        <div className="ai-compose-actions">
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
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={isProcessing}>
            上传识别
          </button>
          <button type="button" className="primary-button" onClick={handleSend} disabled={isProcessing || !message.trim()}>
            {isProcessing ? '处理中' : '发送'}
          </button>
        </div>
      </section>

      {error ? <p className="inline-alert" role="alert">{error}</p> : null}
    </div>
  );
};

export default AIPage;
