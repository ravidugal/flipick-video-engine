import { Request, Response } from 'express';
import pool from '../config/database';

export class ProjectController {
  // List projects (filtered by tenant)
  async list(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const userId = req.user.userId;
      const tenantId = req.user.tenantId;
      const role = req.user.role;
      
      let query: string;
      let params: any[];
      
      if (role === 'super_admin') {
        // Super admin sees ALL projects with tenant info
        query = `
          SELECT p.*, t.name as tenant_name,
                 (SELECT asset_url FROM scenes WHERE project_id = p.id AND asset_url IS NOT NULL AND asset_type = 'image' ORDER BY scene_number LIMIT 1) as first_asset_url, 
                 COUNT(s.id) as scene_count
          FROM projects p
          LEFT JOIN tenants t ON p.tenant_id = t.id
          LEFT JOIN scenes s ON s.project_id = p.id
          GROUP BY p.id, t.name
          ORDER BY p.created_at DESC
        `;
        params = [];
      } else {
        // Tenant users only see their tenant's projects
        query = `
          SELECT p.*,
                 (SELECT asset_url FROM scenes WHERE project_id = p.id AND asset_url IS NOT NULL AND asset_type = 'image' ORDER BY scene_number LIMIT 1) as first_asset_url,
                 COUNT(s.id) as scene_count
          FROM projects p
          LEFT JOIN scenes s ON s.project_id = p.id
          WHERE p.tenant_id = $1
          GROUP BY p.id
          ORDER BY p.created_at DESC
        `;
        params = [tenantId];
      }
      
      const result = await pool.query(query, params);
      
      res.json({
        success: true,
        projects: result.rows
      });
    } catch (error: any) {
      console.error('List projects error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load projects',
        message: error.message
      });
    }
  }
  
    // Get single project
  async get(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const role = req.user.role;
      
      let query: string;
      let params: any[];
      
      if (role === 'super_admin') {
        query = 'SELECT * FROM projects WHERE id = $1';
        params = [id];
      } else {
        // Check tenant access
        query = 'SELECT * FROM projects WHERE id = $1 AND tenant_id = $2';
        params = [id, tenantId];
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Fetch scenes for this project
      const scenesResult = await pool.query(
        'SELECT * FROM scenes WHERE project_id = $1 ORDER BY scene_number ASC',
        [id]
      );
      
      res.json({
        success: true,
        project: result.rows[0],
        scenes: scenesResult.rows
      });
    } catch (error: any) {
      console.error('Get project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load project'
      });
    }
  }
  // Create project
  async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { name, tenant_id, include_quiz, quiz_count, image_source, project_type, training_type, scenario_topic, scenario_industry, scenario_difficulty, scenario_decisions } = req.body;
      console.log('📋 Create project request body:', {
        name,
        tenant_id,
        include_quiz,
        quiz_count,
        image_source,
        project_type,
        training_type,
        scenario_topic,
        scenario_industry,
        scenario_difficulty,
        scenario_decisions
      });
      const userId = req.user.userId;
      const userTenantId = req.user.tenantId;
      const role = req.user.role;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Project name is required'
        });
      }
      
      // Determine which tenant owns this project
      let projectTenantId: string;
      
      if (role === 'super_admin') {
        // Super admin can specify tenant, or defaults to their own
        if (!tenant_id) {
          return res.status(400).json({
            success: false,
            error: 'Tenant selection is required for Super Admin'
          });
        }
        
        // Verify tenant exists
        const tenantCheck = await pool.query(
          'SELECT id FROM tenants WHERE id = $1',
          [tenant_id]
        );
        
        if (tenantCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid tenant selected'
          });
        }
        
        projectTenantId = tenant_id;
      } else {
        // Regular users always create in their own tenant
        projectTenantId = userTenantId;
      }
      
      const result = await pool.query(
          `INSERT INTO projects (name, tenant_id, created_by, include_quiz, quiz_count, image_source, project_type, training_type, brand_color, brand_theme, created_at, updated_at, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), 'draft')
          RETURNING *`,
          [
            name,
            projectTenantId,
            userId,
            include_quiz === true,
            quiz_count || 5,
            image_source || 'GlobalStock',
            project_type || 'scenario',
            training_type || 'scenario',
            null,
            null
          ]
        );
      
      const project = result.rows[0];
      
      // ✨ GENERATE BRANCHING SCENARIO IF IT'S A SCENARIO PROJECT
      if ((project_type === 'scenario' || project.project_type === 'scenario') && scenario_topic) {
        console.log('🎭 Generating branching scenario:', scenario_topic);
        
        try {
          const numDecisions = Math.min(parseInt(scenario_decisions) || 3, 5);
          const scenes = [];
          let sceneNum = 1;
          
          // 1. Create intro
          const introResult = await pool.query(
            `INSERT INTO scenes (
              project_id, scene_number, scene_type, layout,
              title, body, narration, bg_type, gradient
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
              project.id, sceneNum++, 'intro', 'fulltext', name,
              `Welcome to this interactive scenario training on ${scenario_topic}.\\n\\nYou will face ${numDecisions} challenging decisions. Each choice has consequences that affect your journey.`,
              `Welcome. You will face ${numDecisions} decisions. Choose wisely.`,
              'gradient', 'linear-gradient(135deg, #1e1b4b, #312e81)'
            ]
          );
          scenes.push(introResult.rows[0]);
          
          // 2. Generate all decision points
          let nextDecisionId = null;
          
          for (let i = numDecisions; i >= 1; i--) {
            const isLastDecision = (i === numDecisions);
            
            // 2a. For last decision, create final outcome scenes first
            let finalGoodId, finalNeutralId, finalPoorId;
            
            if (isLastDecision) {
              const finalGood = await pool.query(
                `INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, points, bg_type, gradient)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [project.id, sceneNum++, 'final_outcome', 'fulltext', 'Outstanding!',
                 `Excellent performance! Your consistently good decisions demonstrated mastery of ${scenario_topic}.`,
                 'Outstanding! You showed excellent judgment.',
                 10, 'gradient', 'linear-gradient(135deg, #065f46, #047857)']
              );
              
              const finalNeutral = await pool.query(
                `INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, points, bg_type, gradient)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [project.id, sceneNum++, 'final_outcome', 'fulltext', 'Good Job!',
                 `Solid performance. You showed good judgment with room for growth.`,
                 'Good job! Room for improvement.',
                 5, 'gradient', 'linear-gradient(135deg, #1e40af, #2563eb)']
              );
              
              const finalPoor = await pool.query(
                `INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, points, bg_type, gradient)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [project.id, sceneNum++, 'final_outcome', 'fulltext', 'Learning Opportunity',
                 `Review your choices. Consider how different decisions might improve outcomes.`,
                 'Areas for improvement identified.',
                 2, 'gradient', 'linear-gradient(135deg, #991b1b, #dc2626)']
              );
              
              scenes.push(finalGood.rows[0], finalNeutral.rows[0], finalPoor.rows[0]);
              finalGoodId = finalGood.rows[0].id;
              finalNeutralId = finalNeutral.rows[0].id;
              finalPoorId = finalPoor.rows[0].id;
            }
            
            // 2b. Create 3 outcome scenes for this decision
            const outcomeGood: any = await pool.query(
              `INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, points, feedback, next_scene_id, bg_type, gradient)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
              [project.id, sceneNum++, 'outcome', 'fulltext', `Decision ${i}: Excellent!`,
               `Your decisive action worked! ${isLastDecision ? '' : 'But a new challenge emerges...'}`,
               'Excellent choice! Decisive action succeeded.',
               10, 'Strong leadership demonstrated.',
               isLastDecision ? finalGoodId : nextDecisionId,
               'gradient', 'linear-gradient(135deg, #065f46, #047857)']
            );
            
            const outcomeNeutral: any = await pool.query(
              `INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, points, feedback, next_scene_id, bg_type, gradient)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
              [project.id, sceneNum++, 'outcome', 'fulltext', `Decision ${i}: Acceptable`,
               `A cautious approach. ${isLastDecision ? 'Could have been stronger.' : 'The situation continues...'}`,
               'Acceptable. Mixed results from caution.',
               5, 'Consider being more proactive.',
               isLastDecision ? finalNeutralId : nextDecisionId,
               'gradient', 'linear-gradient(135deg, #1e40af, #2563eb)']
            );
            
            const outcomePoor: any = await pool.query(
              `INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, points, feedback, next_scene_id, bg_type, gradient)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
              [project.id, sceneNum++, 'outcome', 'fulltext', `Decision ${i}: Reconsider`,
               `Deferring led to complications. ${isLastDecision ? 'More initiative needed.' : 'Things worsen...'}`,
               'This choice created problems.',
               2, 'Take ownership and act decisively.',
               isLastDecision ? finalPoorId : nextDecisionId,
               'gradient', 'linear-gradient(135deg, #991b1b, #dc2626)']
            );
            
            scenes.push(outcomeGood.rows[0], outcomeNeutral.rows[0], outcomePoor.rows[0]);
            
            // 2c. Create decision scene
            const decision: any = await pool.query(
              `INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, choices, bg_type, gradient)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
              [project.id, sceneNum++, 'scenario_decision', 'fulltext', `Decision ${i} of ${numDecisions}`,
               `Challenging situation: ${scenario_topic}${i > 1 ? '. Your previous choices have shaped this moment.' : ''}.\\n\\nWhat will you do?`,
               `Decision ${i}: What will you do?`,
               JSON.stringify([
                 { text: 'Take decisive action', next_scene_id: outcomeGood.rows[0].id, quality: 'good' },
                 { text: 'Proceed cautiously', next_scene_id: outcomeNeutral.rows[0].id, quality: 'neutral' },
                 { text: 'Defer to others', next_scene_id: outcomePoor.rows[0].id, quality: 'poor' }
               ]),
               'gradient', 'linear-gradient(135deg, #1e3a8a, #1e40af)']
            );
            scenes.push(decision.rows[0]);
            
            // Store this decision ID for previous outcomes to point to
            nextDecisionId = decision.rows[0].id;
          }
          
          // 3. Update intro to point to first decision
          await pool.query(
            'UPDATE scenes SET next_scene_id = $1 WHERE id = $2',
            [nextDecisionId, introResult.rows[0].id]
          );
          
          // 4. Update project
          await pool.query(
            'UPDATE projects SET status = $1, scene_count = $2 WHERE id = $3',
            ['completed', scenes.length, project.id]
          );
          
          console.log(`✅ Generated ${scenes.length} scenes: ${numDecisions} decisions with branching outcomes`);
          project.scenes = scenes;
          
        } catch (error: any) {
          console.error('❌ Scenario error:', error);
        }
      }
      
      res.json({
        success: true,
        message: project.project_type === 'scenario' ? 'Scenario generated successfully' : 'Project created successfully',
        project: project
      });
    } catch (error: any) {
      console.error('Create project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create project',
        message: error.message
      });
    }
  }
  
  // Update project
  async update(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { name } = req.body;
      const tenantId = req.user.tenantId;
      const role = req.user.role;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Project name is required'
        });
      }
      
      let query: string;
      let params: any[];
      
      if (role === 'super_admin') {
        query = 'UPDATE projects SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
        params = [name, id];
      } else {
        // Check tenant access
        query = 'UPDATE projects SET name = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *';
        params = [name, id, tenantId];
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }
      
      res.json({
        success: true,
        message: 'Project updated successfully',
        project: result.rows[0]
      });
    } catch (error: any) {
      console.error('Update project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project'
      });
    }
  }
  
  // Delete project
  async delete(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const role = req.user.role;
      
      let query: string;
      let params: any[];
      
      if (role === 'super_admin') {
        query = 'DELETE FROM projects WHERE id = $1 RETURNING *';
        params = [id];
      } else {
        // Check tenant access
        query = 'DELETE FROM projects WHERE id = $1 AND tenant_id = $2 RETURNING *';
        params = [id, tenantId];
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }
      
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project'
      });
    }
  }
}

export default new ProjectController();