import { Request, Response, NextFunction } from 'express';
import { IngestionService } from '../../service/ingestion.service';

const ingestionService = new IngestionService();

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const imageUrl = req.body.imageUrl ?? req.body.imgUrl;

    if (typeof imageUrl !== 'string') {
      return res.status(400).json({
        data: null,
        error: { message: 'imageUrl is required' },
        code: 'VALIDATION_ERROR',
      });
    }

    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({
        data: null,
        error: { message: 'imageUrl must be a valid URL' },
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await ingestionService.processScreenshot(imageUrl);

    res.status(200).json({
      data: result,
      error: null,
      code: 'OK',
    });
  } catch (error) {
    next(error);
  }
};
