import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { uploadSingle } from '../controllers/upload.controller';
import { ApiError } from '../utils/ApiError';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'Only image files are allowed'));
  },
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
