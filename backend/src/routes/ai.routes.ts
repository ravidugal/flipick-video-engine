import { Router } from 'express';
import aiController from '../controllers/ai.controller';

const router = Router();

// POST /api/ai/topics - Generate topics for a course
router.post('/topics', aiController.generateTopics.bind(aiController));

// POST /api/ai/generate-video - Generate complete video with scenes
router.post('/generate-video', aiController.generateVideo.bind(aiController));

// POST /api/ai/generate-mcqs - Generate MCQ questions for quiz
router.post('/generate-mcqs', aiController.generateMCQs.bind(aiController));

export default router;