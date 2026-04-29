import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../src/service/api.service';
import type { LocalImageInput } from '../../src/types/models/local-image.schema';

const okResponse = (data: unknown): Response => {
  return new Response(JSON.stringify({ data, error: null, code: 'OK' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const requestBody = (call: unknown[]): Record<string, unknown> => {
  const init = call[1] as RequestInit;
  return JSON.parse(String(init.body)) as Record<string, unknown>;
};

describe('api service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends category context with local image extraction requests', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(okResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    const image: LocalImageInput = {
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      name: 'item.png',
      type: 'image/png',
      size: 5,
    };

    await api.extractGuziDraftFromLocalImage(image, [
      { value: 'badge', label: '吧唧' },
      { value: '票根', label: '票根' },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ingestion/extract',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({
      imageUrl: 'data:image/png;base64,aGVsbG8=',
      categories: [
        { value: 'badge', label: '吧唧' },
        { value: '票根', label: '票根' },
      ],
    });
  });
});
