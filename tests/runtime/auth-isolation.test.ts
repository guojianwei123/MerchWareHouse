import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/runtime/app';
import { AuthService } from '../../src/service/auth.service';
import { InventoryService } from '../../src/service/inventory.service';
import { ShowcaseService } from '../../src/service/showcase.service';
import { GuziRepository } from '../../src/repo/guzi.repo';
import { UserRepository } from '../../src/repo/user.repo';
import { ShowcaseRepository } from '../../src/repo/showcase.repo';

let server: Server;
let baseUrl: string;
let tokenA: string;
let tokenB: string;
let userAId: string;
let userBId: string;

const requestJson = async (path: string, init?: RequestInit): Promise<Response> => {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
};

const login = async (code: string): Promise<{ token: string; userId: string }> => {
  const response = await requestJson('/api/auth/miniapp/login', {
    method: 'POST',
    body: JSON.stringify({ provider: 'dev', code }),
  });
  const payload = await response.json();
  return {
    token: payload.data.token,
    userId: payload.data.user.id,
  };
};

const item = {
  id: 'shared-id',
  name: 'Badge One',
  type: 'badge',
  ip: 'Haikyu',
  character: 'Hinata',
  series: 'Birthday',
  imageUrl: 'https://example.com/badge.jpg',
  diameter: 58,
  shape: 'round',
};

describe('authenticated user data isolation', () => {
  beforeAll(async () => {
    server = createApp({
      authService: new AuthService(new UserRepository()),
      inventoryService: new InventoryService(new GuziRepository()),
      showcaseService: new ShowcaseService(new ShowcaseRepository()),
    }).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    const userA = await login('user-a');
    const userB = await login('user-b');
    tokenA = userA.token;
    userAId = userA.userId;
    tokenB = userB.token;
    userBId = userB.userId;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('requires authentication for inventory routes', async () => {
    const response = await requestJson('/api/items');
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('allows browser preflight requests with authorization headers', async () => {
    const response = await requestJson('/api/items', {
      method: 'OPTIONS',
      headers: { 'Access-Control-Request-Headers': 'Authorization' },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toContain('Authorization');
  });

  it('isolates inventory and export data per authenticated user', async () => {
    await requestJson('/api/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(item),
    });

    const userAItems = await (await requestJson('/api/items', {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    const userBItems = await (await requestJson('/api/items', {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    expect(userAItems.data).toHaveLength(1);
    expect(userBItems.data).toHaveLength(0);

    const userBDelete = await requestJson(`/api/items/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const userBDeletePayload = await userBDelete.json();

    expect(userBDeletePayload.data.deleted).toBe(false);

    const userAExport = await (await requestJson('/api/export', {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    const userBExport = await (await requestJson('/api/export', {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    expect(userAExport.data.items).toHaveLength(1);
    expect(userBExport.data.items).toHaveLength(0);
  });

  it('isolates private showcases and blocks cross-owner id overwrites', async () => {
    const response = await requestJson('/api/showcases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        id: 'private-showcase-a',
        title: 'Private A',
        ownerId: 'forged-owner',
        isPublic: false,
        nodes: [
          {
            id: 'room-private-a',
            nodeType: 'room',
            x: 0,
            y: 0,
            width: 300,
            height: 200,
          },
        ],
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.ownerId).toBe(userAId);

    const userBRead = await requestJson('/api/showcases/private-showcase-a', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(userBRead.status).toBe(404);

    const overwrite = await requestJson('/api/showcases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        id: 'private-showcase-a',
        title: 'Hijacked',
        ownerId: userBId,
        isPublic: true,
        nodes: [
          {
            id: 'room-private-b',
            nodeType: 'room',
            x: 0,
            y: 0,
            width: 300,
            height: 200,
          },
        ],
      }),
    });
    const overwritePayload = await overwrite.json();

    expect(overwrite.status).toBe(404);
    expect(overwritePayload.code).toBe('SHOWCASE_NOT_FOUND');

    const userARead = await (await requestJson('/api/showcases/private-showcase-a', {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    expect(userARead.data.title).toBe('Private A');
    expect(userARead.data.isPublic).toBe(false);
  });

  it('keeps public showcase items scoped to the showcase owner and clones to the token user', async () => {
    await requestJson('/api/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        ...item,
        id: 'public-item-a',
        name: 'Public A',
      }),
    });
    await requestJson('/api/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        ...item,
        id: 'public-item-b',
        name: 'Public B',
      }),
    });
    await requestJson('/api/showcases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        id: 'public-showcase-a',
        title: 'Public A',
        ownerId: userAId,
        isPublic: true,
        nodes: [
          {
            id: 'room-public-a',
            nodeType: 'room',
            x: 0,
            y: 0,
            width: 300,
            height: 200,
          },
          {
            id: 'node-public-a',
            nodeType: 'item',
            parentId: 'room-public-a',
            guziId: 'public-item-a',
            x: 10,
            y: 10,
            width: 80,
            height: 80,
          },
          {
            id: 'node-public-b',
            nodeType: 'item',
            parentId: 'room-public-a',
            guziId: 'public-item-b',
            x: 100,
            y: 10,
            width: 80,
            height: 80,
          },
        ],
      }),
    });

    const publicView = await (await requestJson('/api/showcases/public-showcase-a/public')).json();
    expect(publicView.data.items).toHaveLength(1);
    expect(publicView.data.items[0].guziId).toBe('public-item-a');

    const cloned = await requestJson('/api/showcases/public-showcase-a/clone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ ownerId: userAId }),
    });
    const clonedPayload = await cloned.json();

    expect(cloned.status).toBe(201);
    expect(clonedPayload.data.ownerId).toBe(userBId);
    expect(clonedPayload.data.isPublic).toBe(false);
  });

  it('isolates asset dashboard and reminders per authenticated user', async () => {
    const beforeA = await (await requestJson('/api/assets/dashboard', {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    const beforeB = await (await requestJson('/api/assets/dashboard', {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    await requestJson('/api/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        ...item,
        id: 'asset-item-a',
        name: 'Asset A',
        marketPrice: 123,
      }),
    });

    const afterA = await (await requestJson('/api/assets/dashboard', {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    const afterB = await (await requestJson('/api/assets/dashboard', {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    expect(afterA.data.itemCount).toBe(beforeA.data.itemCount + 1);
    expect(afterA.data.marketPriceTotal).toBe(beforeA.data.marketPriceTotal + 123);
    expect(afterB.data).toEqual(beforeB.data);

    const reminder = {
      enabled: true,
      message: '整理 A 的谷子',
      remindAt: new Date(Date.now() + 60_000).toISOString(),
    };
    await requestJson('/api/reminders', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(reminder),
    });

    const userAReminder = await (await requestJson('/api/reminders', {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    const userBReminder = await (await requestJson('/api/reminders', {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    expect(userAReminder.data).toEqual(reminder);
    expect(userBReminder.data).toBeNull();
  });
});
