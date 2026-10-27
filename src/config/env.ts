/**
 * Typed, validated environment configuration.
 * Fails fast at startup if required variables are missing.
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function parseCloudinaryUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'cloudinary:' || !url.hostname) return null;
    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
    };
  } catch {
    return null;
  }
}

const cloudinaryUrl = parseCloudinaryUrl(optional('CLOUDINARY_URL', ''));

export const env = {
  port: parseInt(optional('PORT', '4000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  cors: {
    origins: optional(
      'CORS_ORIGINS',
      'http://localhost:5173,https://xtwiterfe.vercel.app',
    )
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  cloudinary: {
    cloudName: cloudinaryUrl?.cloudName || optional('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: cloudinaryUrl?.apiKey || optional('CLOUDINARY_API_KEY', ''),
    apiSecret: cloudinaryUrl?.apiSecret || optional('CLOUDINARY_API_SECRET', ''),
    folder: optional('CLOUDINARY_FOLDER', 'twitter-clone'),
  },
} as const;

export const isCloudinaryConfigured =
  !!env.cloudinary.cloudName && !!env.cloudinary.apiKey && !!env.cloudinary.apiSecret;
