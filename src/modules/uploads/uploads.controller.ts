import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/errors/AppError';
import { uploadImage, uploadVideo } from './uploads.service';

// POST /api/v1/uploads/image (multipart/form-data, field name: image)
export async function uploadImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) throw AppError.badRequest('Attach an image file in the "image" field.');
    const result = await uploadImage(req.file.buffer);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/uploads/video (multipart/form-data, field name: video)
export async function uploadVideoHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) throw AppError.badRequest('Attach a video file in the "video" field.');
    const result = await uploadVideo(req.file.buffer);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
