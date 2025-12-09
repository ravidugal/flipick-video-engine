import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateScenario,
  startScenarioAttempt,
  recordChoice,
  completeScenarioAttempt,
  getScenarioResults,
  getUserScenarioHistory,
  getScenarioLeaderboard
} from '../controllers/scenario.controller';

const router = Router();

router.use(authenticate);

router.post('/generate', generateScenario);
router.post('/:scenarioId/start', startScenarioAttempt);
router.post('/:scenarioId/choice', recordChoice);
router.post('/:scenarioId/complete', completeScenarioAttempt);
router.get('/:scenarioId/results/:attemptId', getScenarioResults);
router.get('/history', getUserScenarioHistory);
router.get('/:scenarioId/leaderboard', getScenarioLeaderboard);

export default router;
