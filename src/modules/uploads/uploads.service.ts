import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '@/config/env';
import { AppError } from '@/shared/errors/AppError';

let configured = false;

function ensureConfigured(): void {
  if (!isCloudinaryConfigured) {
    throw new AppError(
      'Media uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
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

export interface UploadedMedia {
  url: string;
  public_id: string;
}

/** Alias kept for backwards compatibility with existing imports. */
export type UploadedImage = UploadedMedia;

function toUploadError(
  error: { message?: string; http_code?: number } | undefined,
  fallback: string,
): AppError {
  let message = error?.message ?? fallback;

  if (error?.http_code === 401) {
    message =
      'Cloudinary rejected the configured credentials. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.';
  } else if (error?.http_code === 403) {
    message =
      'Cloudinary API key is missing upload permission. Enable the "create/upload" permission for this key in Cloudinary Console.';
  } else if (error?.http_code === 413) {
    message = 'The file is too large for the media host.';
  }

  return new AppError(message, 502);
}

/** Upload an in-memory image buffer to Cloudinary. */
export function uploadImage(buffer: Buffer): Promise<UploadedMedia> {
  ensureConfigured();

  return new Promise<UploadedMedia>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(toUploadError(error, 'Image upload failed.'));
          return;
        }
        resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );

    stream.end(buffer);
  });
}

/**
 * Upload an in-memory video buffer to Cloudinary.
 *
 * The returned URL is requested with the `.mp4` format so Cloudinary
 * transcodes on delivery — this makes iPhone `.mov` (HEVC) and `.webm`
 * uploads playable in every browser.
 */
export function uploadVideo(buffer: Buffer): Promise<UploadedMedia> {
  ensureConfigured();

  return new Promise<UploadedMedia>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.cloudinary.folder}/videos`,
        resource_type: 'video',
      },
      (error, result) => {
        if (error || !result) {
          reject(toUploadError(error, 'Video upload failed.'));
          return;
        }

        const url = cloudinary.url(result.public_id, {
          resource_type: 'video',
          format: 'mp4',
          version: result.version,
          secure: true,
        });

        resolve({ url, public_id: result.public_id });
      },
    );

    stream.end(buffer);
  });
}
