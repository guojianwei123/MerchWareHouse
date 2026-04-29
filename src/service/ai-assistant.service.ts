import { createChatAdapterFromEnv, type ChatAdapter } from '../adapters/llm/chat.adapter';
import type { GuziCategoryContext } from '../config/categories';
import type { GuziItem } from '../types/models/guzi.schema';
import { IngestionService } from './ingestion.service';

export interface AiAssistantInput {
  message: string;
  imageUrl?: string;
  categories?: GuziCategoryContext[];
}

export interface AiAssistantResponse {
  reply: string;
  drafts?: GuziItem[];
}

export class AiAssistantService {
  constructor(
    private readonly chatAdapter: ChatAdapter = createChatAdapterFromEnv(),
    private readonly ingestionService: IngestionService = new IngestionService(),
  ) {}

  async chat(input: AiAssistantInput): Promise<AiAssistantResponse> {
    const message = input.message.trim();

    if (input.imageUrl) {
      const drafts = await this.ingestionService.processScreenshot(input.imageUrl, input.categories ?? []);
      return {
        reply: this.summarizeDrafts(drafts, message),
        drafts,
      };
    }

    return {
      reply: await this.chatAdapter.chat(message),
    };
  }

  private summarizeDrafts(drafts: GuziItem[], message: string): string {
    if (drafts.length === 0) {
      return '这张图片暂时没有识别出可确认的谷子草稿。可以换一张更清晰的图片，或改用手动录入。';
    }

    const names = drafts
      .slice(0, 3)
      .map((draft) => `《${draft.name}》`)
      .join('、');
    const suffix = drafts.length > 3 ? `等 ${drafts.length} 件` : `${drafts.length} 件`;
    const context = message ? `关于“${message}”，` : '';

    return `${context}我从图片中识别到 ${names}，共 ${suffix}待确认谷子。请进入草稿确认页核对 IP、角色、系列、品类和价格后再入库；市场价格请以你确认的可靠来源为准。`;
  }
}
