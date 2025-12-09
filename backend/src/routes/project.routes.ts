import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import projectController from '../controllers/project.controller';

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Project CRUD routes
router.get('/', (req, res) => projectController.list(req, res));
router.get('/:id', (req, res) => projectController.get(req, res));
router.post('/', (req, res) => projectController.create(req, res));
router.put('/:id', (req, res) => projectController.update(req, res));
router.delete('/:id', (req, res) => projectController.delete(req, res));

export default router;