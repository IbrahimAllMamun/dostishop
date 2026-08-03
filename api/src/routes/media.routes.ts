import { Router } from 'express';
import {
  listMedia,
  createFolder,
  updateFolder,
  deleteFolder,
  updateAsset,
  deleteAsset,
} from '../controllers/media.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  folderCreateSchema,
  folderUpdateSchema,
  assetUpdateSchema,
} from '../schemas/media.schema';

export const mediaRouter = Router();

// The library is private to its shop — nothing here is public
mediaRouter.use(authenticate, authorize('VENDOR', 'SUPER_ADMIN'));

mediaRouter.get('/', listMedia);
mediaRouter.post('/folders', validate(folderCreateSchema), createFolder);
mediaRouter.patch('/folders/:id', validate(folderUpdateSchema), updateFolder);
mediaRouter.delete('/folders/:id', deleteFolder);
mediaRouter.patch('/:id', validate(assetUpdateSchema), updateAsset);
mediaRouter.delete('/:id', deleteAsset);
