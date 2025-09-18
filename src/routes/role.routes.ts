import express from 'express';
import {
  assignRolesToUser,
  create,
  destroy,
  getAll,
  getById,
  update,
} from '../controllers/role.controller.js';
import checkPermission from '../middlewares/checkPermission.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.use(authenticate);
router.get('/', checkPermission('ROLE_GET_ALL'), getAll);
router.get('/:id', checkPermission('ROLE_GET_BY_ID'), getById);
router.post('/', checkPermission('ROLE_CREATE'), create);
router.put('/:id', checkPermission('ROLE_UPDATE'), update);
router.delete('/:id', checkPermission('ROLE_DELETE'), destroy);
router.post('/assign-roles', checkPermission('ROLE_ASSIGN'), assignRolesToUser);

export default router;
