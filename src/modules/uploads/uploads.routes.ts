import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@/middleware/auth.middleware';
import { AppError } from '@/shared/errors/AppError';
import { uploadImageHandler, uploadVideoHandler } from './uploads.controller';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(AppError.badRequest('Only image files are allowed.'));
      return;
    }
    callback(null, true);
  },
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_VIDEO_TYPES.has(file.mimetype)) {
      callback(AppError.badRequest('Only MP4, WebM or MOV video files are allowed.'));
      return;
    }
    callback(null, true);
  },
});

const router = Router();

router.use(authenticate);

/** POST /api/v1/uploads/image */
router.post('/image', imageUpload.single('image'), uploadImageHandler);

/** POST /api/v1/uploads/video */
router.post('/video', videoUpload.single('video'), uploadVideoHandler);

export default router;
