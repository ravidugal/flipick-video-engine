import { Router } from 'express';
import voiceController from '../controllers/voice.controller';

const router = Router();

router.get('/voices', (req, res) => voiceController.getVoices(req, res));
router.post('/voiceover/generate', (req, res) => voiceController.generateVoiceOver(req, res));

export default router;
