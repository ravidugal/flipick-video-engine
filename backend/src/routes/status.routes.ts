import { Router } from 'express';
import statusController from '../controllers/status.controller';

const router = Router();

router.get('/status', (req, res) => statusController.getStatus(req, res));

export default router;
