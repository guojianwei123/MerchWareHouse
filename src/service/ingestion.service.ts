export class IngestionService {
  async processScreenshot(screenshotUrl: string): Promise<any> {
    return { extractedData: 'placeholder' };
  }

  async validateExtractedJson(data: any): Promise<boolean> {
    return true;
  }

  async createDraftItem(data: any): Promise<any> {
    return { draftId: 'draft-123' };
  }
}
