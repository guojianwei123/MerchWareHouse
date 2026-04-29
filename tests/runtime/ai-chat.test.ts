import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/runtime/app';

let server: Server;
let baseUrl: string;
const originalAiProvider = process.env.AI_PROVIDER;

const postJson = async (body: unknown): Promise<Response> => {
  return fetch(`${baseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

describe('POST /api/ai/chat', () => {
  beforeAll(async () => {
    process.env.AI_PROVIDER = 'mock';
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    process.env.AI_PROVIDER = originalAiProvider;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('returns validation errors for empty messages', async () => {
    const response = await postJson({ message: '' });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('returns a text AI reply', async () => {
    const response = await postJson({ message: '什么是吧唧？' });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.reply).toContain('这是谷子助手的模拟回答');
    expect(payload.data.drafts).toBeUndefined();
  });

  it('returns drafts for image chat requests', async () => {
    const response = await postJson({
      message: '请识别',
      imageUrl: 'data:image/png;base64,aGVsbG8=',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.reply).toContain('我从图片中识别到');
    expect(payload.data.drafts).toHaveLength(1);
    expect(payload.data.drafts[0]).toMatchObject({
      name: 'Mock Badge',
      type: 'badge',
    });
  });
});
