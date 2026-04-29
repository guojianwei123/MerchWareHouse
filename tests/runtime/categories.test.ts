import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CategoryRepository } from '../../src/repo/category.repo';
import { GuziRepository } from '../../src/repo/guzi.repo';
import { CategoryService } from '../../src/service/category.service';
import { createApp } from '../../src/runtime/app';

let server: Server;
let baseUrl: string;
const guziRepository = new GuziRepository();
const categoryService = new CategoryService(new CategoryRepository(), guziRepository);

const requestJson = async (path: string, init?: RequestInit): Promise<Response> => {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
};

describe('/api/categories', () => {
  beforeAll(async () => {
    server = createApp({ categoryService }).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('creates and lists categories', async () => {
    const createResponse = await requestJson('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ ownerId: 'api-user', name: '票根', tone: 'blue' }),
    });
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created.data).toMatchObject({ ownerId: 'api-user', name: '票根', tone: 'blue' });

    const listResponse = await requestJson('/api/categories?ownerId=api-user');
    const listed = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].name).toBe('票根');
  });

  it('returns validation errors for empty category names', async () => {
    const response = await requestJson('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ ownerId: 'api-user', name: ' ', tone: 'pink' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe('VALIDATION_ERROR');
  });

  it('returns structured errors for duplicate names', async () => {
    await requestJson('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ ownerId: 'api-user', name: '吧唧袋', tone: 'blue' }),
    });

    const response = await requestJson('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ ownerId: 'api-user', name: '吧唧袋', tone: 'gold' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.code).toBe('CATEGORY_DUPLICATE');
  });

  it('blocks deleting categories used by inventory items', async () => {
    const createResponse = await requestJson('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ ownerId: 'api-user', name: '明信片', tone: 'mint' }),
    });
    const created = await createResponse.json();

    await guziRepository.saveItem({
      id: 'postcard-1',
      name: 'Postcard',
      type: '明信片',
      ip: 'Test IP',
      character: 'Test Character',
      series: 'Test Series',
      imageUrl: 'https://example.com/postcard.jpg',
    });

    const response = await requestJson(`/api/categories/${encodeURIComponent(created.data.id)}?ownerId=api-user`, {
      method: 'DELETE',
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.code).toBe('CATEGORY_IN_USE');
  });
});
