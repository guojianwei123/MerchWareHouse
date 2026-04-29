import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CategoryRepository } from '../../src/repo/category.repo';
import { GuziRepository } from '../../src/repo/guzi.repo';
import { CategoryService } from '../../src/service/category.service';
import { createApp } from '../../src/runtime/app';
import { AuthService } from '../../src/service/auth.service';
import { UserRepository } from '../../src/repo/user.repo';

let server: Server;
let baseUrl: string;
let authHeader: string;
const guziRepository = new GuziRepository();
const categoryService = new CategoryService(new CategoryRepository(), guziRepository);
const authService = new AuthService(new UserRepository());

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
    server = createApp({ categoryService, authService }).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    const loginResponse = await requestJson('/api/auth/miniapp/login', {
      method: 'POST',
      body: JSON.stringify({ provider: 'dev', code: 'api-user' }),
    });
    const loginPayload = await loginResponse.json();
    authHeader = `Bearer ${loginPayload.data.token}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('creates and lists categories', async () => {
    const createResponse = await requestJson('/api/categories', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: JSON.stringify({ name: '票根', tone: 'blue' }),
    });
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created.data).toMatchObject({ name: '票根', tone: 'blue' });

    const listResponse = await requestJson('/api/categories', {
      headers: { Authorization: authHeader },
    });
    const listed = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].name).toBe('票根');
  });

  it('returns validation errors for empty category names', async () => {
    const response = await requestJson('/api/categories', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: JSON.stringify({ name: ' ', tone: 'pink' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe('VALIDATION_ERROR');
  });

  it('returns structured errors for duplicate names', async () => {
    await requestJson('/api/categories', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: JSON.stringify({ name: '吧唧袋', tone: 'blue' }),
    });

    const response = await requestJson('/api/categories', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: JSON.stringify({ name: '吧唧袋', tone: 'gold' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.code).toBe('CATEGORY_DUPLICATE');
  });

  it('blocks deleting categories used by inventory items', async () => {
    const createResponse = await requestJson('/api/categories', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: JSON.stringify({ name: '明信片', tone: 'mint' }),
    });
    const created = await createResponse.json();

    await guziRepository.saveItem(created.data.ownerId, {
      id: 'postcard-1',
      name: 'Postcard',
      type: '明信片',
      ip: 'Test IP',
      character: 'Test Character',
      series: 'Test Series',
      imageUrl: 'https://example.com/postcard.jpg',
    });

    const response = await requestJson(`/api/categories/${encodeURIComponent(created.data.id)}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.code).toBe('CATEGORY_IN_USE');
  });

  it('requires authentication for protected category routes', async () => {
    const response = await requestJson('/api/categories');
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe('AUTH_INVALID_TOKEN');
  });
});
