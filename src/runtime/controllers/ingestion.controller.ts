import { Request, Response, NextFunction } from 'express';
import { IngestionService } from '../../service/ingestion.service';

const ingestionService = new IngestionService();

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
