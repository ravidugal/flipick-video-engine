import { Router } from 'express';
import projectController from '../controllers/project.controller';

const router = Router();

// CRUD operations
router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

export default router;
