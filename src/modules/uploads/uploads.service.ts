import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '@/config/env';
import { AppError } from '@/shared/errors/AppError';

let configured = false;

function ensureConfigured(): void {
  if (!isCloudinaryConfigured) {
    throw new AppError(
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      503,
    );
  }
  if (configured) return;

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
  configured = true;
}

export interface UploadedImage {
  url: string;
  public_id: string;
}

/** Upload an in-memory image buffer to Cloudinary. */
export function uploadImage(buffer: Buffer): Promise<UploadedImage> {
  ensureConfigured();

  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          let message = error?.message ?? 'Image upload failed.';

          if (error?.http_code === 401) {
            message =
              'Cloudinary rejected the configured credentials. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.';
          } else if (error?.http_code === 403) {
            message =
              'Cloudinary API key is missing upload permission. Enable the "create/upload" permission for this key in Cloudinary Console.';
          }

          reject(new AppError(message, 502));
          return;
        }
        resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );

    stream.end(buffer);
  });
}
