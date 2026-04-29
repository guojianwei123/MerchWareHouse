import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AccessoryService } from '../service/accessory.service';
import { AuthService } from '../service/auth.service';
import { AiAssistantService } from '../service/ai-assistant.service';
import { calculateAssetDashboard } from '../service/asset-dashboard.service';
import { CategoryService, CategoryServiceError } from '../service/category.service';
import { IngestionService } from '../service/ingestion.service';
import { InventoryService } from '../service/inventory.service';
import { ShowcaseService } from '../service/showcase.service';
import { PrismaCategoryRepository } from '../repo/category.repo';
import { PrismaGuziRepository } from '../repo/guzi.repo';
import { PrismaShowcaseRepository } from '../repo/showcase.repo';
import { PrismaUserRepository } from '../repo/user.repo';
import { StorageAdapter } from '../adapters/oss/storage.adapter';
import { GuziFilterSchema } from '../types/models/guzi.schema';
import { isSupportedImageSource } from '../types/models/local-image.schema';
import { ShowcaseSchema } from '../types/models/spatial.schema';
import { errorHandler } from './middlewares/error.middleware';
import { createRequireAuth, requireAuthenticatedUser, type AuthenticatedRequest } from './middlewares/auth.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';

const prisma = new PrismaClient();
const guziRepository = new PrismaGuziRepository(prisma);
const inventoryService = new InventoryService(guziRepository);
const categoryService = new CategoryService(new PrismaCategoryRepository(prisma), guziRepository);
const showcaseService = new ShowcaseService(new PrismaShowcaseRepository(prisma));
const authService = new AuthService(new PrismaUserRepository(prisma));
const storageAdapter = new StorageAdapter();
const accessoryService = new AccessoryService();

const ok = (data: unknown) => ({ data, error: null, code: 'OK' });

const uploadSchema = z.object({
  fileBase64: z.string().min(1),
  originalName: z.string().min(1).default('image.jpg'),
  contentType: z.string().min(1).default('image/jpeg'),
});

const imageUrlSchema = z.object({
  imageUrl: z.string().refine(isSupportedImageSource, {
    message: 'imageUrl must be a valid URL or image data URL',
  }),
  categories: z.array(z.object({
    value: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(40),
  })).optional().default([]),
});

const reminderSchema = z.object({
  enabled: z.boolean(),
  message: z.string().min(1).max(120),
  remindAt: z.string().datetime(),
});

const themeGenerateSchema = z.object({
  subject: z.string().min(1).max(80),
});

const aiChatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  imageUrl: z.string().refine(isSupportedImageSource, {
    message: 'imageUrl must be a valid URL or image data URL',
  }).optional(),
  categories: z.array(z.object({
    value: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(40),
  })).optional().default([]),
});

const linkParseSchema = z.object({
  url: z.string().url(),
});
const reminderSettings = new Map<string, z.infer<typeof reminderSchema>>();

const getIngestionService = (() => {
  let service: IngestionService | null = null;

  return (): IngestionService => {
    service ??= new IngestionService();
    return service;
  };
})();

const getAiAssistantService = (() => {
  let service: AiAssistantService | null = null;

  return (): AiAssistantService => {
    service ??= new AiAssistantService();
    return service;
  };
})();

const isBlockedHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();

  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === 'metadata.google.internal'
  ) {
    return true;
  }

  const ipv4 = normalized.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);

  if (!ipv4) {
    return normalized === '::1' || normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd');
  }

  const [a, b] = ipv4.slice(1).map(Number);

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
};

const parseSafeExternalUrl = (value: string): URL => {
  const url = new URL(value);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http and https links can be parsed');
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error('Private or local network links cannot be parsed');
  }

  return url;
};

const fetchTextWithLimits = async (url: URL): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Link request failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error('Link parser only accepts HTML pages');
  }

  const reader = response.body?.getReader();

  if (!reader) {
    return response.text();
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const maxBytes = 512 * 1024;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > maxBytes) {
      throw new Error('Link response is too large');
    }

    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
};

const handleCategoryError = (error: unknown, res: express.Response, next: express.NextFunction) => {
  if (error instanceof CategoryServiceError) {
    return res.status(error.statusCode).json({
      data: null,
      error: { message: error.message },
      code: error.code,
    });
  }

  next(error);
};

export const createApp = (overrides: {
  categoryService?: CategoryService;
  authService?: AuthService;
  inventoryService?: InventoryService;
  showcaseService?: ShowcaseService;
} = {}) => {
  const app = express();
  const appCategoryService = overrides.categoryService ?? categoryService;
  const appAuthService = overrides.authService ?? authService;
  const appInventoryService = overrides.inventoryService ?? inventoryService;
  const appShowcaseService = overrides.showcaseService ?? showcaseService;
  const requireAuth = createRequireAuth(appAuthService);

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '10mb' }));
  app.use(requestLogger);
  app.use('/uploads', express.static(process.env.UPLOAD_DIR ?? './uploads'));

  app.post('/api/auth/miniapp/login', async (req, res, next) => {
    try {
      res.json(ok(await appAuthService.login(req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.json(ok(await appAuthService.updateProfile(user.id, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/uploads/images', async (req, res, next) => {
    try {
      const input = uploadSchema.parse(req.body);
      const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024);
      const allowedTypes = ['image/jpeg', 'image/png'];

      if (!allowedTypes.includes(input.contentType)) {
        return res.status(400).json({
          data: null,
          error: { message: 'Unsupported image type' },
          code: 'VALIDATION_ERROR',
        });
      }

      const buffer = Buffer.from(input.fileBase64, 'base64');

      if (buffer.byteLength > maxBytes) {
        return res.status(400).json({
          data: null,
          error: { message: 'Image is too large' },
          code: 'VALIDATION_ERROR',
        });
      }

      res.json(ok({ imageUrl: await storageAdapter.uploadImage(buffer, input.originalName) }));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/ingestion/extract', async (req, res, next) => {
    try {
      const input = imageUrlSchema.parse(req.body);
      res.json(ok(await getIngestionService().processScreenshot(input.imageUrl, input.categories)));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/ai/chat', async (req, res, next) => {
    try {
      const input = aiChatSchema.parse(req.body);
      res.json(ok(await getAiAssistantService().chat(input)));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/links/parse', async (req, res, next) => {
    try {
      const input = linkParseSchema.parse(req.body);
      let safeUrl: URL;

      try {
        safeUrl = parseSafeExternalUrl(input.url);
      } catch (error) {
        return res.status(400).json({
          data: null,
          error: { message: error instanceof Error ? error.message : 'Invalid link' },
          code: 'VALIDATION_ERROR',
        });
      }

      const html = await fetchTextWithLimits(safeUrl);
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
      const imageUrl = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];

      res.json(ok({ sourceUrl: safeUrl.toString(), title, imageUrl }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/items', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const filter = GuziFilterSchema.parse(req.query);
      res.json(ok(await appInventoryService.listItems(user.id, filter)));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/items', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.status(201).json(ok(await appInventoryService.createItem(user.id, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/items/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.json(ok(await appInventoryService.updateItem(user.id, req.params.id, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/items/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.json(ok({ deleted: await appInventoryService.deleteItem(user.id, req.params.id) }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/categories', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.json(ok(await appCategoryService.listCategories(user.id)));
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  });

  app.post('/api/categories', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.status(201).json(ok(await appCategoryService.createCategory({ ...req.body, ownerId: user.id })));
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  });

  app.patch('/api/categories/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.json(ok(await appCategoryService.updateCategory(req.params.id, { ...req.body, ownerId: user.id })));
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  });

  app.delete('/api/categories/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.json(ok({ deleted: await appCategoryService.deleteCategory(req.params.id, user.id) }));
    } catch (error) {
      handleCategoryError(error, res, next);
    }
  });

  app.get('/api/assets/dashboard', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.json(ok(calculateAssetDashboard(await appInventoryService.listItems(user.id))));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/accessories/recommendations/:itemId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const item = await appInventoryService.getItem(user.id, req.params.itemId);

      if (!item) {
        return res.status(404).json({ data: null, error: { message: 'Item not found' }, code: 'NOT_FOUND' });
      }

      res.json(ok(accessoryService.recommendForItem(item)));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/showcases/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const showcase = await appShowcaseService.getShowcase(user.id, req.params.id);

      if (!showcase) {
        return res.status(404).json({ data: null, error: { message: 'Showcase not found' }, code: 'NOT_FOUND' });
      }

      res.json(ok(showcase));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/showcases', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      res.status(201).json(ok(await appShowcaseService.saveShowcase(user.id, ShowcaseSchema.parse({ ...req.body, ownerId: user.id }))));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/showcases/:id/public', async (req, res, next) => {
    try {
      const showcase = await appShowcaseService.getPublicShowcase(req.params.id);
      const ownerItems = showcase ? await appInventoryService.listItems(showcase.ownerId) : [];
      const view = await appShowcaseService.getPublicView(req.params.id, ownerItems);

      if (!view) {
        return res.status(404).json({ data: null, error: { message: 'Showcase not found or private' }, code: 'NOT_FOUND' });
      }

      res.json(ok(view));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/showcases/:id/clone', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const cloned = await appShowcaseService.clonePublicShowcase(req.params.id, user.id);

      if (!cloned) {
        return res.status(404).json({ data: null, error: { message: 'Showcase not found or private' }, code: 'NOT_FOUND' });
      }

      res.status(201).json(ok(cloned));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/export', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const items = await appInventoryService.listItems(user.id);
      res.json(ok({
        exportedAt: new Date().toISOString(),
        items,
        assetDashboard: calculateAssetDashboard(items),
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/reminders', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = requireAuthenticatedUser(req);
    res.json(ok(reminderSettings.get(user.id) ?? null));
  });

  app.put('/api/reminders', requireAuth, (req: AuthenticatedRequest, res, next) => {
    try {
      const user = requireAuthenticatedUser(req);
      const settings = reminderSchema.parse(req.body);
      reminderSettings.set(user.id, settings);
      res.json(ok(settings));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/themes/generate', (req, res, next) => {
    try {
      const input = themeGenerateSchema.parse(req.body);
      res.json(ok({
        key: `ai-${input.subject}`,
        tokens: {
          '--color-primary': '#79b9cf',
          '--color-primary-strong': '#2e748e',
          '--color-surface': '#fffaf0',
          '--color-surface-soft': '#e8f6f9',
        },
      }));
    } catch (error) {
      next(error);
    }
  });

  app.use(errorHandler);

  return app;
};
