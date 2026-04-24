import { Request, Response, NextFunction } from 'express';

// Mock ingestion service for now
const ingestionService = {
  processScreenshot: async (imgUrl: string) => {
    return { data: 'mock data' };
  }
};

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imgUrl } = req.body;

    if (!imgUrl) {
      return res.status(400).json({ error: 'imgUrl is required' });
    }

    const result = await ingestionService.processScreenshot(imgUrl);

    res.status(200).json({
      message: 'Image processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
