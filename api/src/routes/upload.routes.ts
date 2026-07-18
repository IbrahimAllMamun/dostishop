import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { uploadSingle } from '../controllers/upload.controller';
import { ApiError } from '../utils/ApiError';

const imageFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
  else cb(new ApiError(400, 'Only image files are allowed'));
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFilter,
});

// Smaller limit for anonymous review photos
const reviewUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: imageFilter,
});

const reviewUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, // 10 anonymous photo uploads per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadRouter = Router();

// Vendors and admins can upload images
uploadRouter.post(
  '/',
  authenticate,
  authorize('VENDOR', 'SUPER_ADMIN'),
  upload.single('file'),
  uploadSingle,
);

// Public: review photos (rate-limited, 2MB, images only)
uploadRouter.post('/review', reviewUploadLimiter, reviewUpload.single('file'), uploadSingle);
