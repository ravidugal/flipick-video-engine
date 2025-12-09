import { Request, Response } from 'express';
import pool from '../config/database';

export const updateScene = async (req: Request, res: Response) => {
  try {
    const { projectId, sceneId } = req.params;
    const { 
      title, 
      body, 
      eyebrow, 
      layout, 
      asset_url, 
      bg_type,
      asset_type,
      narration,
      audio_url,
      audio_duration
    } = req.body;

    const query = `
      UPDATE scenes 
      SET 
        title = COALESCE($1, title),
        body = COALESCE($2, body),
        eyebrow = COALESCE($3, eyebrow),
        layout = COALESCE($4, layout),
        asset_url = COALESCE($5, asset_url),
        bg_type = COALESCE($6, bg_type),
        asset_type = COALESCE($7, asset_type),
        narration = COALESCE($8, narration),
        audio_url = COALESCE($9, audio_url),
        audio_duration = COALESCE($10, audio_duration),
        updated_at = NOW()
      WHERE id = $11 AND project_id = $12
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      body,
      eyebrow,
      layout,
      asset_url,
      bg_type,
      asset_type,
      narration,
      audio_url,
      audio_duration,
      sceneId,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Scene not found' 
      });
    }

    res.json({ 
      success: true, 
      scene: result.rows[0] 
    });
  } catch (error: any) {
    console.error('❌ Update scene error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update scene',
      message: error.message 
    });
  }
};

