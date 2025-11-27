import { Request, Response } from 'express';
import pool from '../config/database';

export class ProjectController {
  /**
   * Create new project
   */
  async createProject(req: Request, res: Response) {
    try {
      const { prompt, courseName, scenes } = req.body;

      if (!prompt || !scenes || !Array.isArray(scenes)) {
        return res.status(400).json({ error: 'Invalid request data' });
      }

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert project
        const projectResult = await client.query(
          'INSERT INTO projects (prompt, course_name, status) VALUES ($1, $2, $3) RETURNING *',
          [prompt, courseName || prompt, 'draft']
        );

        const project = projectResult.rows[0];

        // Insert scenes
        for (const scene of scenes) {
          await client.query(
            `INSERT INTO scenes (project_id, scene_number, title, content, design_json, duration)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              project.id,
              scene.sceneNumber,
              scene.title,
              scene.content || '',
              scene.design ? JSON.stringify(scene.design) : null,
              scene.duration || 15.0,
            ]
          );
        }

        await client.query('COMMIT');

        // Fetch complete project with scenes
        const scenesResult = await client.query(
          'SELECT * FROM scenes WHERE project_id = $1 ORDER BY scene_number',
          [project.id]
        );

        res.status(201).json({
          success: true,
          project: {
            ...project,
            scenes: scenesResult.rows,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Create project error:', error);
      res.status(500).json({
        error: 'Failed to create project',
        message: error.message,
      });
    }
  }

  /**
   * Get all projects
   */
  async getProjects(req: Request, res: Response) {
    try {
      const result = await pool.query(
        `SELECT p.*, 
                COUNT(s.id) as scene_count,
                v.video_url,
                v.status as video_status
         FROM projects p
         LEFT JOIN scenes s ON s.project_id = p.id
         LEFT JOIN videos v ON v.project_id = p.id
         GROUP BY p.id, v.id
         ORDER BY p.created_at DESC`
      );

      res.json({
        success: true,
        projects: result.rows,
      });
    } catch (error: any) {
      console.error('❌ Get projects error:', error);
      res.status(500).json({
        error: 'Failed to fetch projects',
        message: error.message,
      });
    }
  }

  /**
   * Get project by ID
   */
  async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const scenesResult = await pool.query(
        'SELECT * FROM scenes WHERE project_id = $1 ORDER BY scene_number',
        [id]
      );

      const videoResult = await pool.query(
        'SELECT * FROM videos WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
        [id]
      );

      res.json({
        success: true,
        project: {
          ...projectResult.rows[0],
          scenes: scenesResult.rows,
          video: videoResult.rows[0] || null,
        },
      });
    } catch (error: any) {
      console.error('❌ Get project error:', error);
      res.status(500).json({
        error: 'Failed to fetch project',
        message: error.message,
      });
    }
  }

  /**
   * Update project
   */
  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { courseName, scenes } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update project
        if (courseName) {
          await client.query('UPDATE projects SET course_name = $1, updated_at = NOW() WHERE id = $2', [
            courseName,
            id,
          ]);
        }

        // Update scenes if provided
        if (scenes && Array.isArray(scenes)) {
          // Delete existing scenes
          await client.query('DELETE FROM scenes WHERE project_id = $1', [id]);

          // Insert updated scenes
          for (const scene of scenes) {
            await client.query(
              `INSERT INTO scenes (project_id, scene_number, title, content, design_json, duration)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                id,
                scene.sceneNumber,
                scene.title,
                scene.content,
                scene.design ? JSON.stringify(scene.design) : null,
                scene.duration || 15.0,
              ]
            );
          }
        }

        await client.query('COMMIT');

        // Fetch updated project
        const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
        const scenesResult = await client.query(
          'SELECT * FROM scenes WHERE project_id = $1 ORDER BY scene_number',
          [id]
        );

        res.json({
          success: true,
          project: {
            ...projectResult.rows[0],
            scenes: scenesResult.rows,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Update project error:', error);
      res.status(500).json({
        error: 'Failed to update project',
        message: error.message,
      });
    }
  }

  /**
   * Delete project
   */
  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await pool.query('DELETE FROM projects WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error: any) {
      console.error('❌ Delete project error:', error);
      res.status(500).json({
        error: 'Failed to delete project',
        message: error.message,
      });
    }
  }
}

export default new ProjectController();
