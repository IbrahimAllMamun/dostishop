import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { uploadImage, usingCloudinary } from '../services/upload.service';

export const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded (use form field "file")');
  const url = await uploadImage(req.file.buffer, req.file.originalname);
  res.status(201).json({ url, storage: usingCloudinary ? 'cloudinary' : 'local' });
});
