import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// User routes
router.get('/', userController.list);           // GET /api/users - List users
router.get('/:id', userController.get);         // GET /api/users/:id - Get single user
router.post('/', userController.create);        // POST /api/users - Create user
router.put('/:id', userController.update);      // PUT /api/users/:id - Update user
router.delete('/:id', userController.delete);   // DELETE /api/users/:id - Delete user

export default router;