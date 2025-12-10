import { Request, Response } from 'express';
import pool from '../config/database';
import { generateScenarioContent } from '../services/scenario-ai.service';

/**
 * Generate a new scenario-based training project
 * POST /api/scenarios/generate
 */
export const generateScenario = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const {
      name,
      topic,
      industry,
      difficulty = 'beginner',
      decision_points = 3,
      tenant_id
    } = req.body;

    // Validation
    if (!name || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Name and topic are required'
      });
    }

    await client.query('BEGIN');

    // 1. Create project
    const projectResult = await client.query(
      `INSERT INTO projects (
        name, prompt, training_type, project_type, tenant_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [
        name,
        `Scenario training: ${topic}`,
        'scenario',
        'scenario',
        tenant_id,
        'draft',
        (req as any).user?.id || 'system'
      ]
    );

    const project = projectResult.rows[0];

    // 2. Create scenario metadata
    const scenarioResult = await client.query(
      `INSERT INTO scenarios (
        project_id, title, description, difficulty, decision_points, 
        industry, topic
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [
        project.id,
        name,
        `Scenario-based training on ${topic}`,
        difficulty,
        decision_points,
        industry || 'General',
        topic
      ]
    );

    const scenario = scenarioResult.rows[0];

    // 3. Generate scenario content using AI
    console.log('🤖 Generating scenario content with AI...');
    const generatedContent = await generateScenarioContent({
      topic,
      industry: industry || 'General',
      difficulty,
      decision_points
    });

    // 4. Calculate max score
    let maxScore = 0;
    generatedContent.scenes.forEach((scene: any) => {
      if (scene.points) maxScore += scene.points;
      if (scene.choices) {
        scene.choices.forEach((choice: any) => {
          if (choice.points > maxScore) maxScore = choice.points;
        });
      }
    });

    // 5. Insert scenes
    const scenes: any[] = [];
    for (let i = 0; i < generatedContent.scenes.length; i++) {
      const sceneData = generatedContent.scenes[i];
      
      const sceneResult = await client.query(
        `INSERT INTO scenes (
          project_id, scene_number, scene_type, layout,
          title, body, narration, 
          choices, next_scene_id, choice_quality, points, feedback,
          bg_type, gradient
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          project.id,
          i + 1,
          sceneData.scene_type || 'content',
          sceneData.layout || 'fulltext',
          sceneData.title,
          sceneData.body,
          sceneData.narration || sceneData.body,
          JSON.stringify(sceneData.choices || []),
          (sceneData as any).next_scene_id || null,
          sceneData.choice_quality || null,
          sceneData.points || 0,
          sceneData.feedback || null,
          sceneData.bg_type || 'gradient',
          sceneData.gradient || 'linear-gradient(135deg, #1e1b4b, #312e81)'
        ]
      );
      
      scenes.push(sceneResult.rows[0]);
    }

    // 6. Update scenario max_score
    await client.query(
      'UPDATE scenarios SET max_score = $1 WHERE id = $2',
      [maxScore, scenario.id]
    );

    // 7. Update next_scene_id references with actual UUIDs
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneData = generatedContent.scenes[i];
      
      if (sceneData.choices && sceneData.choices.length > 0) {
        const updatedChoices = sceneData.choices.map((choice: any) => {
          const targetScene = scenes.find(s => s.scene_number === choice.target_scene_number);
          return {
            ...choice,
            next_scene_id: targetScene?.id || null
          };
        });
        
        await client.query(
          'UPDATE scenes SET choices = $1 WHERE id = $2',
          [JSON.stringify(updatedChoices), scene.id]
        );
      }
    }

    await client.query('COMMIT');

    console.log('✅ Scenario generated successfully');

    res.json({
      success: true,
      project: {
        ...project,
        scenes: scenes
      },
      scenario: {
        ...scenario,
        max_score: maxScore
      }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error generating scenario:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate scenario'
    });
  } finally {
    client.release();
  }
};

export const startScenarioAttempt = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const scenarioResult = await pool.query('SELECT max_score FROM scenarios WHERE id = $1', [scenarioId]);
    if (scenarioResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Scenario not found' });
    }

    const maxScore = scenarioResult.rows[0].max_score;
    const attemptResult = await pool.query(
      `INSERT INTO scenario_attempts (scenario_id, user_id, max_score, status, started_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [scenarioId, userId, maxScore, 'in_progress']
    );

    res.json({ success: true, attempt: attemptResult.rows[0] });
  } catch (error: any) {
    console.error('❌ Error starting attempt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const recordChoice = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const { attemptId, sceneId, choiceId, choiceQuality, points } = req.body;

    if (!attemptId || !sceneId || !choiceId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const attemptResult = await pool.query('SELECT * FROM scenario_attempts WHERE id = $1', [attemptId]);
    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    const attempt = attemptResult.rows[0];
    const pathTaken = [...(attempt.path_taken || []), sceneId];
    const choicesMade = [...(attempt.choices_made || []), {
      scene_id: sceneId,
      choice_id: choiceId,
      quality: choiceQuality,
      points: points || 0,
      timestamp: new Date().toISOString()
    }];
    const newScore = attempt.score + (points || 0);

    await pool.query(
      `UPDATE scenario_attempts SET path_taken = $1, choices_made = $2, score = $3 WHERE id = $4`,
      [JSON.stringify(pathTaken), JSON.stringify(choicesMade), newScore, attemptId]
    );

    const sceneResult = await pool.query('SELECT choices FROM scenes WHERE id = $1', [sceneId]);
    if (sceneResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }

    const choices = sceneResult.rows[0].choices || [];
    const selectedChoice = choices.find((c: any) => c.id === choiceId);

    res.json({
      success: true,
      next_scene_id: selectedChoice?.next_scene_id || null,
      points_earned: points || 0,
      total_score: newScore
    });
  } catch (error: any) {
    console.error('❌ Error recording choice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const completeScenarioAttempt = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const { attemptId } = req.body;

    const result = await pool.query(
      `UPDATE scenario_attempts SET status = 'completed', completed_at = NOW() 
       WHERE id = $1 AND scenario_id = $2 RETURNING *`,
      [attemptId, scenarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    res.json({ success: true, attempt: result.rows[0] });
  } catch (error: any) {
    console.error('❌ Error completing scenario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getScenarioResults = async (req: Request, res: Response) => {
  try {
    const { scenarioId, attemptId } = req.params;

    const result = await pool.query(
      `SELECT sa.*, s.title as scenario_title, s.max_score as scenario_max_score
       FROM scenario_attempts sa
       JOIN scenarios s ON sa.scenario_id = s.id
       WHERE sa.id = $1 AND sa.scenario_id = $2`,
      [attemptId, scenarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Results not found' });
    }

    res.json({ success: true, results: result.rows[0] });
  } catch (error: any) {
    console.error('❌ Error getting results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserScenarioHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const result = await pool.query(
      `SELECT sa.*, s.title as scenario_title, s.difficulty, s.topic
       FROM scenario_attempts sa
       JOIN scenarios s ON sa.scenario_id = s.id
       WHERE sa.user_id = $1
       ORDER BY sa.completed_at DESC NULLS LAST, sa.started_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ success: true, history: result.rows });
  } catch (error: any) {
    console.error('❌ Error getting history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getScenarioLeaderboard = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await pool.query(
      `SELECT * FROM scenario_leaderboard 
       WHERE scenario_id = $1 
       ORDER BY best_percentage DESC, fastest_time ASC
       LIMIT $2`,
      [scenarioId, limit]
    );

    res.json({ success: true, leaderboard: result.rows });
  } catch (error: any) {
    console.error('❌ Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
