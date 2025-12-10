import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ============================================
// INTERFACES
// ============================================

export interface IElevenLabsVoice {
  voice_id: string;
  name: string;
  category: 'premade' | 'cloned' | 'professional';
  labels: {
    accent?: string;
    age?: string;
    gender?: string;
    description?: string;
    use_case?: string;
  };
  preview_url?: string;
  available_for_tiers?: string[];
  high_quality_base_model_ids?: string[];
}

export interface IVoiceSettings {
  stability: number;           // 0-1, higher = more consistent
  similarity_boost: number;    // 0-1, higher = closer to original
  style?: number;              // 0-1, style exaggeration
  use_speaker_boost?: boolean; // Enhance speaker clarity
}

export interface IVoiceConfig {
  voiceId: string;
  voiceName: string;
  language: string;
  accent?: string;
  gender?: 'male' | 'female' | 'neutral';
  settings: IVoiceSettings;
}

export interface ISpeechGenerationRequest {
  text: string;
  voiceId: string;
  modelId?: string;
  settings?: IVoiceSettings;
  outputFormat?: 'mp3_44100_128' | 'mp3_44100_192' | 'pcm_16000' | 'pcm_22050';
}

export interface IGeneratedAudio {
  audioUrl: string;
  audioBlob?: Blob;
  duration: number;
  characterCount: number;
  voiceId: string;
}

export interface ISceneAudio {
  sceneId: number;
  sceneTitle: string;
  script: string;
  audio?: IGeneratedAudio;
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
}

// Language configurations for L&D global reach
export interface ILanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  voices: string[];  // Recommended voice IDs
  isRTL: boolean;
}

// ============================================
// CONSTANTS
// ============================================

// Eleven Labs Models
export const ELEVEN_LABS_MODELS = {
  MULTILINGUAL_V2: 'eleven_multilingual_v2',    // Best for non-English
  TURBO_V2: 'eleven_turbo_v2',                  // Fastest, English
  MONOLINGUAL_V1: 'eleven_monolingual_v1',      // Legacy English
  MULTILINGUAL_V1: 'eleven_multilingual_v1'     // Legacy multilingual
};

// Curated voices for L&D content
export const CURATED_VOICES: Record<string, IVoiceConfig[]> = {
  english_us: [
    {
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      voiceName: 'Sarah',
      language: 'en-US',
      accent: 'American',
      gender: 'female',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    },
    {
      voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
      voiceName: 'Liam',
      language: 'en-US',
      accent: 'American',
      gender: 'male',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    },
    {
      voiceId: 'XB0fDUnXU5powFXDhCwa',
      voiceName: 'Charlotte',
      language: 'en-US',
      accent: 'American',
      gender: 'female',
      settings: { stability: 0.6, similarity_boost: 0.8 }
    }
  ],
  english_uk: [
    {
      voiceId: 'ThT5KcBeYPX3keUQqHPh',
      voiceName: 'Dorothy',
      language: 'en-GB',
      accent: 'British',
      gender: 'female',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    },
    {
      voiceId: 'IKne3meq5aSn9XLyUdCD',
      voiceName: 'Charlie',
      language: 'en-GB',
      accent: 'British',
      gender: 'male',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    }
  ],
  english_au: [
    {
      voiceId: 'XrExE9yKIg1WjnnlVkGX',
      voiceName: 'Matilda',
      language: 'en-AU',
      accent: 'Australian',
      gender: 'female',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    }
  ],
  english_in: [
    {
      voiceId: 'nPczCjzI2devNBz1zQrb',
      voiceName: 'Brian',
      language: 'en-IN',
      accent: 'Indian',
      gender: 'male',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    }
  ],
  spanish: [
    {
      voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
      voiceName: 'Alice',
      language: 'es',
      accent: 'Spanish',
      gender: 'female',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    }
  ],
  french: [
    {
      voiceId: 'XrExE9yKIg1WjnnlVkGX',
      voiceName: 'Amelie',
      language: 'fr',
      accent: 'French',
      gender: 'female',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    }
  ],
  german: [
    {
      voiceId: 'onwK4e9ZLuTAKqWW03F9',
      voiceName: 'Daniel',
      language: 'de',
      accent: 'German',
      gender: 'male',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    }
  ],
  hindi: [
    {
      voiceId: 'nPczCjzI2devNBz1zQrb',
      voiceName: 'Raj',
      language: 'hi',
      accent: 'Hindi',
      gender: 'male',
      settings: { stability: 0.5, similarity_boost: 0.75 }
    }
  ]
};

// Supported languages for L&D
export const SUPPORTED_LANGUAGES: ILanguageConfig[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English', voices: ['EXAVITQu4vr4xnSDxMaL', 'TX3LPaxmHKxFdv7VOQHJ'], isRTL: false },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English', voices: ['ThT5KcBeYPX3keUQqHPh', 'IKne3meq5aSn9XLyUdCD'], isRTL: false },
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English', voices: ['XrExE9yKIg1WjnnlVkGX'], isRTL: false },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', voices: ['nPczCjzI2devNBz1zQrb'], isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', voices: ['Xb7hH8MSUJpSbSDYk0k2'], isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Français', voices: ['XrExE9yKIg1WjnnlVkGX'], isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', voices: ['onwK4e9ZLuTAKqWW03F9'], isRTL: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', voices: [], isRTL: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', voices: [], isRTL: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voices: ['nPczCjzI2devNBz1zQrb'], isRTL: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', voices: [], isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', voices: [], isRTL: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', voices: [], isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', voices: [], isRTL: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', voices: [], isRTL: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', voices: [], isRTL: false }
];

// Default voice settings for different content types
export const VOICE_PRESETS: Record<string, IVoiceSettings> = {
  training: {
    stability: 0.6,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true
  },
  narration: {
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.2,
    use_speaker_boost: true
  },
  conversational: {
    stability: 0.4,
    similarity_boost: 0.7,
    style: 0.5,
    use_speaker_boost: false
  },
  dramatic: {
    stability: 0.3,
    similarity_boost: 0.6,
    style: 0.8,
    use_speaker_boost: true
  }
};

@Injectable({
  providedIn: 'root'
})
export class ElevenLabsVoiceService {

  private apiKey = environment.elevenLabsApiKey || '';
  private baseUrl = 'https://api.elevenlabs.io/v1';
  
  // Track generation status
  private generationQueue: Map<string, ISceneAudio> = new Map();
  
  constructor(private http: HttpClient) {}

  // ============================================
  // API HEADERS
  // ============================================

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json'
    });
  }

  private getAudioHeaders(): HttpHeaders {
    return new HttpHeaders({
      'xi-api-key': this.apiKey,
      'Accept': 'audio/mpeg'
    });
  }

  // ============================================
  // VOICE MANAGEMENT
  // ============================================

  /**
   * Get all available voices from Eleven Labs
   */
  getVoices(): Observable<IElevenLabsVoice[]> {
    return this.http.get<any>(`${this.baseUrl}/voices`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.voices || []),
      catchError(err => {
        console.error('Error fetching voices:', err);
        return of([]);
      })
    );
  }

  /**
   * Get voices filtered by language/accent
   */
  getVoicesByLanguage(languageCode: string): Observable<IElevenLabsVoice[]> {
    return this.getVoices().pipe(
      map(voices => voices.filter(v => {
        const accent = v.labels?.accent?.toLowerCase() || '';
        const lang = languageCode.toLowerCase();
        
        // Match based on language code or accent
        if (lang.startsWith('en')) {
          if (lang === 'en-us') return accent.includes('american');
          if (lang === 'en-gb') return accent.includes('british');
          if (lang === 'en-au') return accent.includes('australian');
          if (lang === 'en-in') return accent.includes('indian');
          return accent.includes('english') || accent.includes('american');
        }
        
        return accent.includes(lang) || 
               v.name.toLowerCase().includes(lang);
      }))
    );
  }

  /**
   * Get curated voices for L&D content
   */
  getCuratedVoices(languageKey: string = 'english_us'): IVoiceConfig[] {
    return CURATED_VOICES[languageKey] || CURATED_VOICES['english_us'];
  }

  /**
   * Get voice details
   */
  getVoiceDetails(voiceId: string): Observable<IElevenLabsVoice | null> {
    return this.http.get<IElevenLabsVoice>(`${this.baseUrl}/voices/${voiceId}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => {
        console.error('Error fetching voice details:', err);
        return of(null);
      })
    );
  }

  // ============================================
  // SPEECH GENERATION
  // ============================================

  /**
   * Generate speech from text
   */
  generateSpeech(request: ISpeechGenerationRequest): Observable<Blob> {
    const { text, voiceId, modelId, settings, outputFormat } = request;
    
    const body = {
      text,
      model_id: modelId || ELEVEN_LABS_MODELS.MULTILINGUAL_V2,
      voice_settings: settings || VOICE_PRESETS['training'],
      output_format: outputFormat || 'mp3_44100_128'
    };

    return this.http.post(
      `${this.baseUrl}/text-to-speech/${voiceId}`,
      body,
      { 
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Generate speech with streaming (for longer content)
   */
  generateSpeechStream(request: ISpeechGenerationRequest): Observable<Blob> {
    const { text, voiceId, modelId, settings } = request;
    
    const body = {
      text,
      model_id: modelId || ELEVEN_LABS_MODELS.MULTILINGUAL_V2,
      voice_settings: settings || VOICE_PRESETS['training'],
    };

    return this.http.post(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      body,
      { 
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  /**
   * Generate audio for a scene and return URL
   */
  generateSceneAudio(
    sceneId: number,
    sceneTitle: string,
    script: string,
    voiceConfig: IVoiceConfig
  ): Observable<ISceneAudio> {
    const sceneAudio: ISceneAudio = {
      sceneId,
      sceneTitle,
      script,
      status: 'generating'
    };

    this.generationQueue.set(`scene_${sceneId}`, sceneAudio);

    return this.generateSpeech({
      text: script,
      voiceId: voiceConfig.voiceId,
      settings: voiceConfig.settings
    }).pipe(
      map(blob => {
        const audioUrl = URL.createObjectURL(blob);
        const duration = this.estimateDuration(script);
        
        const completedAudio: ISceneAudio = {
          ...sceneAudio,
          status: 'completed',
          audio: {
            audioUrl,
            audioBlob: blob,
            duration,
            characterCount: script.length,
            voiceId: voiceConfig.voiceId
          }
        };

        this.generationQueue.set(`scene_${sceneId}`, completedAudio);
        return completedAudio;
      }),
      catchError(err => {
        const errorAudio: ISceneAudio = {
          ...sceneAudio,
          status: 'error',
          error: err.message || 'Failed to generate audio'
        };
        this.generationQueue.set(`scene_${sceneId}`, errorAudio);
        return of(errorAudio);
      })
    );
  }

  /**
   * Generate audio for multiple scenes (batch)
   */
  generateBatchAudio(
    scenes: Array<{ id: number; title: string; script: string }>,
    voiceConfig: IVoiceConfig
  ): Observable<ISceneAudio[]> {
    const requests = scenes.map(scene => 
      this.generateSceneAudio(scene.id, scene.title, scene.script, voiceConfig)
    );

    return from(Promise.all(requests.map(req => req.toPromise()))) as Observable<ISceneAudio[]>;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Estimate audio duration based on text length
   * Average speaking rate: ~150 words per minute
   */
  estimateDuration(text: string): number {
    const words = text.split(/\s+/).length;
    const wordsPerSecond = 150 / 60; // 2.5 words per second
    return Math.ceil(words / wordsPerSecond);
  }

  /**
   * Get character usage/quota
   */
  getUsage(): Observable<{ character_count: number; character_limit: number }> {
    return this.http.get<any>(`${this.baseUrl}/user/subscription`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => ({
        character_count: response.character_count || 0,
        character_limit: response.character_limit || 0
      })),
      catchError(() => of({ character_count: 0, character_limit: 0 }))
    );
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): ILanguageConfig[] {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Get voice presets
   */
  getVoicePresets(): Record<string, IVoiceSettings> {
    return VOICE_PRESETS;
  }

  /**
   * Get generation queue status
   */
  getGenerationStatus(sceneId: number): ISceneAudio | undefined {
    return this.generationQueue.get(`scene_${sceneId}`);
  }

  /**
   * Clear generation queue
   */
  clearGenerationQueue(): void {
    // Revoke blob URLs to free memory
    this.generationQueue.forEach(audio => {
      if (audio.audio?.audioUrl) {
        URL.revokeObjectURL(audio.audio.audioUrl);
      }
    });
    this.generationQueue.clear();
  }

  /**
   * Create voice selection UI data
   */
  getVoiceSelectionData(): Observable<{
    languages: ILanguageConfig[];
    voicesByLanguage: Record<string, IElevenLabsVoice[]>;
  }> {
    return this.getVoices().pipe(
      map(voices => {
        const voicesByLanguage: Record<string, IElevenLabsVoice[]> = {};
        
        // Group voices by detected language/accent
        voices.forEach(voice => {
          const accent = voice.labels?.accent?.toLowerCase() || 'other';
          let langKey = 'en-US'; // Default
          
          if (accent.includes('british')) langKey = 'en-GB';
          else if (accent.includes('australian')) langKey = 'en-AU';
          else if (accent.includes('indian')) langKey = 'en-IN';
          else if (accent.includes('spanish')) langKey = 'es';
          else if (accent.includes('french')) langKey = 'fr';
          else if (accent.includes('german')) langKey = 'de';
          
          if (!voicesByLanguage[langKey]) {
            voicesByLanguage[langKey] = [];
          }
          voicesByLanguage[langKey].push(voice);
        });

        return {
          languages: SUPPORTED_LANGUAGES,
          voicesByLanguage
        };
      })
    );
  }
}