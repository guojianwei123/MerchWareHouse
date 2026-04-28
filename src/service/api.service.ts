import type { GuziFilter, GuziItem } from '../types/models/guzi.schema';
import {
  isSupportedImageDataUrl,
  isSupportedLocalImageType,
  LOCAL_IMAGE_MAX_BYTES,
  type LocalImageInput,
} from '../types/models/local-image.schema';
import type { Showcase, ShowcasePublicView } from '../types/models/spatial.schema';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

interface ApiResponse<T> {
  data: T;
  error: { message: string } | null;
  code: string;
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `API request failed: ${response.status}`);
  }

  return payload.data;
};

const queryString = (filter: GuziFilter): string => {
  const params = new URLSearchParams();

  Object.entries(filter).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString() ? `?${params.toString()}` : '';
};

export const fileToLocalImageInput = (file: File): Promise<LocalImageInput> => {
  if (!isSupportedLocalImageType(file.type)) {
    return Promise.reject(new Error('请选择 JPEG 或 PNG 图片。'));
  }

  const type = file.type;

  if (file.size > LOCAL_IMAGE_MAX_BYTES) {
    return Promise.reject(new Error('图片不能超过 5MB。'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string' || !isSupportedImageDataUrl(reader.result)) {
        reject(new Error('图片读取失败，请重新选择。'));
        return;
      }

      resolve({
        dataUrl: reader.result,
        name: file.name,
        type,
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择。'));
    reader.readAsDataURL(file);
  });
};

export const api = {
  extractGuziDraft: (imageUrl: string): Promise<GuziItem[]> => {
    return request('/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  },
  extractGuziDraftFromLocalImage: (image: LocalImageInput): Promise<GuziItem[]> => {
    return request('/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: image.dataUrl }),
    });
  },
  parseLink: (url: string): Promise<{ sourceUrl: string; title?: string; imageUrl?: string }> => {
    return request('/api/links/parse', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },
  listItems: (filter: GuziFilter = {}): Promise<GuziItem[]> => {
    return request(`/api/items${queryString(filter)}`);
  },
  createItem: (item: GuziItem): Promise<GuziItem> => {
    return request('/api/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },
  updateItem: (item: GuziItem): Promise<GuziItem> => {
    return request(`/api/items/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    });
  },
  deleteItem: (id: string): Promise<{ deleted: boolean }> => {
    return request(`/api/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  saveShowcase: (showcase: Showcase): Promise<Showcase> => {
    return request('/api/showcases', {
      method: 'POST',
      body: JSON.stringify(showcase),
    });
  },
  getPublicShowcase: (id: string): Promise<ShowcasePublicView> => {
    return request(`/api/showcases/${encodeURIComponent(id)}/public`);
  },
  cloneShowcase: (id: string, ownerId: string): Promise<Showcase> => {
    return request(`/api/showcases/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
      body: JSON.stringify({ ownerId }),
    });
  },
  exportData: (): Promise<unknown> => {
    return request('/api/export');
  },
  saveReminder: (input: { enabled: boolean; message: string; remindAt: string }): Promise<unknown> => {
    return request('/api/reminders', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
  generateTheme: (subject: string): Promise<{ key: string; tokens: Record<string, string> }> => {
    return request('/api/themes/generate', {
      method: 'POST',
      body: JSON.stringify({ subject }),
    });
  },
};
