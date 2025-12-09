import { Router } from 'express';
import * as sceneController from '../controllers/scene.controller';

const router = Router();

// Update a specific scene
router.put('/:projectId/scenes/:sceneId', sceneController.updateScene);

export default router;
