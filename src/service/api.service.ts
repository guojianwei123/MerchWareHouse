import type { GuziFilter, GuziItem } from '../types/models/guzi.schema';
import type { GuziCategoryContext } from '../config/categories';
import type { Category, CategoryTone } from '../types/models/category.schema';
import type { AuthProvider, AuthSession, User, UserProfile } from '../types/models/user.schema';
import {
  isSupportedImageDataUrl,
  isSupportedLocalImageType,
  LOCAL_IMAGE_MAX_BYTES,
  type LocalImageInput,
} from '../types/models/local-image.schema';
import type { Showcase, ShowcasePublicView } from '../types/models/spatial.schema';

const normalizeApiBaseUrl = (value?: string): string => {
  if (!value) {
    return '';
  }

  return value.replace(/\/$/, '');
};

const apiBaseUrl = import.meta.env.DEV ? '' : normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

interface ApiResponse<T> {
  data: T;
  error: { message: string } | null;
  code: string;
}

interface AiChatInput {
  message: string;
  imageUrl?: string;
  categories?: GuziCategoryContext[];
}

interface AiChatResponse {
  reply: string;
  drafts?: GuziItem[];
}

interface CategoryCreateInput {
  name: string;
  tone: CategoryTone;
}

interface CategoryUpdateInput {
  name: string;
}

interface MiniappLoginInput {
  provider: AuthProvider;
  code: string;
  profile?: UserProfile;
}

let authToken = '';

export const setApiAuthToken = (token: string): void => {
  authToken = token;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('无法连接到后端服务，请确认 API 服务已启动后重试。');
  }

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
  loginWithMiniapp: (input: MiniappLoginInput): Promise<AuthSession> => {
    return request('/api/auth/miniapp/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateMe: (profile: UserProfile): Promise<User> => {
    return request('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    });
  },
  extractGuziDraft: (imageUrl: string, categories: GuziCategoryContext[] = []): Promise<GuziItem[]> => {
    return request('/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, categories }),
    });
  },
  extractGuziDraftFromLocalImage: (image: LocalImageInput, categories: GuziCategoryContext[] = []): Promise<GuziItem[]> => {
    return request('/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: image.dataUrl, categories }),
    });
  },
  parseLink: (url: string): Promise<{ sourceUrl: string; title?: string; imageUrl?: string }> => {
    return request('/api/links/parse', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },
  chatWithAi: (input: AiChatInput): Promise<AiChatResponse> => {
    return request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(input),
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
  listCategories: (): Promise<Category[]> => {
    return request('/api/categories');
  },
  createCategory: (input: CategoryCreateInput): Promise<Category> => {
    return request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  updateCategory: (id: string, input: CategoryUpdateInput): Promise<Category> => {
    return request(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
  deleteCategory: (id: string): Promise<{ deleted: boolean }> => {
    return request(`/api/categories/${encodeURIComponent(id)}`, {
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
  cloneShowcase: (id: string): Promise<Showcase> => {
    return request(`/api/showcases/${encodeURIComponent(id)}/clone`, {
      method: 'POST',
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
