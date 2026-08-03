import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../lib/prisma';
import { uploadImage, usingCloudinary } from '../services/upload.service';
import { recordAsset } from './media.controller';

export const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded (use form field "file")');
  const url = await uploadImage(req.file.buffer, req.file.originalname);

  // Anything a signed-in user uploads joins their library, wherever it was
  // uploaded from — the gallery is only useful if it is complete. Anonymous
  // review photos are not somebody's media, so they are skipped.
  if (req.user) {
    const shop =
      req.user.role === 'SUPER_ADMIN'
        ? null
        : await prisma.shop.findUnique({ where: { ownerId: req.user.sub }, select: { id: true } });

    // A failure to index must not fail the upload the caller is waiting on
    try {
      await recordAsset({
        shopId: shop?.id ?? null,
        url,
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      });
    } catch {
      // The file is stored and the URL is returned; the library can catch up
    }
  }

  res.status(201).json({ url, storage: usingCloudinary ? 'cloudinary' : 'local' });
});
