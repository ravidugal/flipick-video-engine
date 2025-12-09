import { Request, Response } from 'express';
import elevenLabsService from '../services/elevenlabs.service';

export class VoiceController {
  /**
   * Get available voices
   */
  getVoices(req: Request, res: Response) {
    try {
      const voices = elevenLabsService.getVoices();
      const configured = elevenLabsService.isConfigured();

      res.json({
        success: true,
        voices,
        configured
      });
    } catch (error: any) {
      console.error('❌ Get voices error:', error);
      res.status(500).json({
        error: 'Failed to get voices',
        message: error.message
      });
    }
  }

  /**
   * Generate voice-over for scenes
   */
  async generateVoiceOver(req: Request, res: Response) {
  try {
    const { scenes, voiceId } = req.body;
    
    if (!scenes || !Array.isArray(scenes)) {
      return res.status(400).json({ error: 'Scenes array is required' });
    }
    if (!voiceId) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    console.log(`🎙️ Generating voice-over for ${scenes.length} scenes with voice: ${voiceId}`);

    const audioClips = await elevenLabsService.generateVoiceOvers(scenes, voiceId);

    // Save audio URLs to database
    const pool = require('../config/database').default;
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const clip = audioClips[i];
      
      if (clip && clip.audio && scene.id) {
        try {
          await pool.query(
            `UPDATE scenes 
             SET audio_url = $1, audio_duration = $2, voice_id = $3, updated_at = NOW()
             WHERE id = $4`,
            [clip.audio, clip.duration, voiceId, scene.id]
          );
          console.log(`✅ Saved audio for scene ${i + 1}`);
        } catch (dbError) {
          console.error(`❌ Failed to save audio for scene ${i + 1}:`, dbError);
        }
      }
    }

    res.json({
      success: true,
      audioClips
    });
  } catch (error: any) {
    console.error('❌ Voice-over generation error:', error);
    res.status(500).json({
      error: 'Failed to generate voice-over',
      message: error.message
    });
  }
}
}

export default new VoiceController();
