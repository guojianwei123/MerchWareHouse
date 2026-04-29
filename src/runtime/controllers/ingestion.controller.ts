import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IngestionService } from '../../service/ingestion.service';
import { isSupportedImageSource } from '../../types/models/local-image.schema';

const ingestionService = new IngestionService();
const categoryContextSchema = z.array(z.object({
  value: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(40),
})).optional().default([]);

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

    if (!isSupportedImageSource(imageUrl)) {
      return res.status(400).json({
        data: null,
        error: { message: 'imageUrl must be a valid URL or image data URL' },
        code: 'VALIDATION_ERROR',
      });
    }

    const categories = categoryContextSchema.parse(req.body.categories);
    const result = await ingestionService.processScreenshot(imageUrl, categories);

    res.status(200).json({
      data: result,
      error: null,
      code: 'OK',
    });
  } catch (error) {
    next(error);
  }
};
