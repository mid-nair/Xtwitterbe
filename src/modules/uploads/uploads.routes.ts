import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@/middleware/auth.middleware';
import { AppError } from '@/shared/errors/AppError';
import { uploadImageHandler } from './uploads.controller';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const upload = multer({
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

const router = Router();

router.use(authenticate);

/** POST /api/v1/uploads/image */
router.post('/image', upload.single('image'), uploadImageHandler);

export default router;
