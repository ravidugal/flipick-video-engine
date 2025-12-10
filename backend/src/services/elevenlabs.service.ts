import { config } from '../config/env';

interface Voice {
  id: string;
  name: string;
  desc: string;
  category: 'indian' | 'standard';
}

// Curated voice list with Indian voices on top
const VOICES: Voice[] = [
  // Indian English voices
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Indian)', desc: 'Deep, authoritative', category: 'indian' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Indian)', desc: 'Clear, professional', category: 'indian' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Raj', desc: 'Warm, friendly', category: 'indian' },
  
  // Standard voices
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', desc: 'Young, energetic', category: 'standard' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', desc: 'Well-rounded', category: 'standard' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', desc: 'Emotional, soft', category: 'standard' }
];

class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = config.apiKeys.elevenlabs;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_elevenlabs_api_key_here';
  }

  getVoices(): Voice[] {
    return VOICES;
  }

  async generateAudio(text: string, voiceId: string): Promise<{ audio: string; duration: number } | null> {
    if (!this.isConfigured()) {
      console.log('⚠️ ElevenLabs not configured, skipping audio generation');
      return null;
    }

    try {
      console.log(`🎙️ Generating audio for: "${text.substring(0, 50)}..."`);

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Get audio as buffer
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;

      // Estimate duration (roughly 150 words per minute for speech)
      const wordCount = text.split(' ').length;
      const estimatedDuration = (wordCount / 150) * 60 * 1000; // milliseconds

      console.log(`✅ Audio generated: ${wordCount} words, ~${Math.round(estimatedDuration/1000)}s`);

      return {
        audio: base64Audio,
        duration: Math.round(estimatedDuration)
      };

    } catch (error: any) {
      console.error('❌ ElevenLabs error:', error.message);
      return null;
    }
  }

  async generateVoiceOvers(scenes: any[], voiceId: string): Promise<any[]> {
    const audioClips = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const narration = scene.narration || scene.body || scene.title || '';

      if (!narration) {
        console.log(`⚠️ Scene ${i}: No narration text, skipping`);
        audioClips.push({ audio: null, duration: 0 });
        continue;
      }

      const result = await this.generateAudio(narration, voiceId);
      
      if (result) {
        audioClips.push(result);
      } else {
        audioClips.push({ audio: null, duration: 0 });
      }

      // Rate limiting: wait 1 second between requests
      if (i < scenes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return audioClips;
  }
}

export default new ElevenLabsService();
