import { describe, expect, it } from 'vitest';
import type { ChatAdapter } from '../../src/adapters/llm/chat.adapter';
import type { VisionAdapter } from '../../src/adapters/llm/vision.adapter';
import { AiAssistantService } from '../../src/service/ai-assistant.service';
import { IngestionService } from '../../src/service/ingestion.service';

class StaticChatAdapter implements ChatAdapter {
  async chat(): Promise<string> {
    return '吧唧通常指徽章类谷子，收纳时注意尺寸和防潮。';
  }
}

class StaticVisionAdapter implements VisionAdapter {
  async extractGuziInfo(): Promise<unknown> {
    return {
      name: 'Birthday Badge',
      type: 'badge',
      ip: 'Haikyu',
      character: 'Hinata',
      series: 'Birthday',
      purchasePrice: 58,
      diameter: 58,
      shape: 'round',
    };
  }
}

describe('AiAssistantService', () => {
  it('returns text chat replies without drafts', async () => {
    const service = new AiAssistantService(new StaticChatAdapter(), new IngestionService(new StaticVisionAdapter()));

    await expect(service.chat({ message: '吧唧怎么收纳？' })).resolves.toEqual({
      reply: '吧唧通常指徽章类谷子，收纳时注意尺寸和防潮。',
    });
  });

  it('creates image drafts and returns a Chinese summary', async () => {
    const service = new AiAssistantService(new StaticChatAdapter(), new IngestionService(new StaticVisionAdapter()));

    const response = await service.chat({
      message: '帮我识别',
      imageUrl: 'data:image/png;base64,aGVsbG8=',
    });

    expect(response.reply).toContain('我从图片中识别到');
    expect(response.reply).toContain('Birthday Badge');
    expect(response.drafts).toHaveLength(1);
    expect(response.drafts?.[0]).toMatchObject({
      name: 'Birthday Badge',
      type: 'badge',
      imageUrl: 'data:image/png;base64,aGVsbG8=',
    });
  });
});
