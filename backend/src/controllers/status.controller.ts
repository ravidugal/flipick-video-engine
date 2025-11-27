import { Request, Response } from 'express';
import { config } from '../config/env';
import elevenLabsService from '../services/elevenlabs.service';

export class StatusController {
  getStatus(req: Request, res: Response) {
    try {
      const pexelsConfigured = !!config.apiKeys.pexels && config.apiKeys.pexels !== 'your_pexels_api_key_here';
      const claudeConfigured = !!config.apiKeys.anthropic && config.apiKeys.anthropic !== 'your_anthropic_api_key_here';
      const elevenLabsConfigured = elevenLabsService.isConfigured();

      res.json({
        success: true,
        services: {
          pexels: {
            configured: pexelsConfigured,
            status: pexelsConfigured ? 'ready' : 'not_configured'
          },
          claude: {
            configured: claudeConfigured,
            status: claudeConfigured ? 'ready' : 'not_configured'
          },
          elevenLabs: {
            configured: elevenLabsConfigured,
            status: elevenLabsConfigured ? 'ready' : 'not_configured'
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Status check error:', error);
      res.status(500).json({
        error: 'Failed to check status',
        message: error.message
      });
    }
  }
}

export default new StatusController();
