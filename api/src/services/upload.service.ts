import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env, uploadsDir } from '../config/env';

/** Cloudinary is used when a CLOUDINARY_URL env var or the three discrete vars are set. */
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL ||
    (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
);

if (cloudinaryConfigured && !process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export const usingCloudinary = cloudinaryConfigured;

/** Store an image buffer and return its public URL.
 *  Uses Cloudinary when configured, otherwise writes to local disk (served at /uploads). */
export async function uploadImage(buffer: Buffer, originalName: string): Promise<string> {
  if (cloudinaryConfigured) {
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'boutique', resource_type: 'image' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  // Local-disk fallback
  const ext = (path.extname(originalName) || '.jpg').toLowerCase();
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, name), buffer);
  return `${env.API_PUBLIC_URL}/uploads/${name}`;
}
