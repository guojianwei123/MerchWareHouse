import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AccessoryService } from '../service/accessory.service';
import { calculateAssetDashboard } from '../service/asset-dashboard.service';
import { IngestionService } from '../service/ingestion.service';
import { InventoryService } from '../service/inventory.service';
import { ShowcaseService } from '../service/showcase.service';
import { PrismaGuziRepository } from '../repo/guzi.repo';
import { PrismaShowcaseRepository } from '../repo/showcase.repo';
import { StorageAdapter } from '../adapters/oss/storage.adapter';
import { GuziFilterSchema } from '../types/models/guzi.schema';
import { isSupportedImageSource } from '../types/models/local-image.schema';
import { ShowcaseSchema } from '../types/models/spatial.schema';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';

const prisma = new PrismaClient();
const inventoryService = new InventoryService(new PrismaGuziRepository(prisma));
const showcaseService = new ShowcaseService(new PrismaShowcaseRepository(prisma));
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
});

const reminderSchema = z.object({
  enabled: z.boolean(),
  message: z.string().min(1).max(120),
  remindAt: z.string().datetime(),
});

const themeGenerateSchema = z.object({
  subject: z.string().min(1).max(80),
});

const linkParseSchema = z.object({
  url: z.string().url(),
});

let reminderSettings: z.infer<typeof reminderSchema> | null = null;

const getIngestionService = (() => {
  let service: IngestionService | null = null;

  return (): IngestionService => {
    service ??= new IngestionService();
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

export const createApp = () => {
  const app = express();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '10mb' }));
  app.use(requestLogger);
  app.use('/uploads', express.static(process.env.UPLOAD_DIR ?? './uploads'));

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
      res.json(ok(await getIngestionService().processScreenshot(input.imageUrl)));
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

  app.get('/api/items', async (req, res, next) => {
    try {
      const filter = GuziFilterSchema.parse(req.query);
      res.json(ok(await inventoryService.listItems(filter)));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/items', async (req, res, next) => {
    try {
      res.status(201).json(ok(await inventoryService.createItem(req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/items/:id', async (req, res, next) => {
    try {
      res.json(ok(await inventoryService.updateItem(req.params.id, req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/items/:id', async (req, res, next) => {
    try {
      res.json(ok({ deleted: await inventoryService.deleteItem(req.params.id) }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/assets/dashboard', async (req, res, next) => {
    try {
      res.json(ok(calculateAssetDashboard(await inventoryService.listItems())));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/accessories/recommendations/:itemId', async (req, res, next) => {
    try {
      const item = await inventoryService.getItem(req.params.itemId);

      if (!item) {
        return res.status(404).json({ data: null, error: { message: 'Item not found' }, code: 'NOT_FOUND' });
      }

      res.json(ok(accessoryService.recommendForItem(item)));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/showcases/:id', async (req, res, next) => {
    try {
      const showcase = await showcaseService.getShowcase(req.params.id);

      if (!showcase) {
        return res.status(404).json({ data: null, error: { message: 'Showcase not found' }, code: 'NOT_FOUND' });
      }

      res.json(ok(showcase));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/showcases', async (req, res, next) => {
    try {
      res.status(201).json(ok(await showcaseService.saveShowcase(ShowcaseSchema.parse(req.body))));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/showcases/:id/public', async (req, res, next) => {
    try {
      const view = await showcaseService.getPublicView(req.params.id, await inventoryService.listItems());

      if (!view) {
        return res.status(404).json({ data: null, error: { message: 'Showcase not found or private' }, code: 'NOT_FOUND' });
      }

      res.json(ok(view));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/showcases/:id/clone', async (req, res, next) => {
    try {
      const ownerId = z.object({ ownerId: z.string().min(1).default('local-user') }).parse(req.body).ownerId;
      const cloned = await showcaseService.clonePublicShowcase(req.params.id, ownerId);

      if (!cloned) {
        return res.status(404).json({ data: null, error: { message: 'Showcase not found or private' }, code: 'NOT_FOUND' });
      }

      res.status(201).json(ok(cloned));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/export', async (req, res, next) => {
    try {
      const items = await inventoryService.listItems();
      res.json(ok({
        exportedAt: new Date().toISOString(),
        items,
        assetDashboard: calculateAssetDashboard(items),
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/reminders', (req, res) => {
    res.json(ok(reminderSettings));
  });

  app.put('/api/reminders', (req, res, next) => {
    try {
      reminderSettings = reminderSchema.parse(req.body);
      res.json(ok(reminderSettings));
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
