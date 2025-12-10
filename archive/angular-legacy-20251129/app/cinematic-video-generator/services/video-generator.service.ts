import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ============================================
// INTERFACES
// ============================================
export interface IVideoGenerationConfig {
  projectName: string;
  subject?: string;
  industry: string;
  category: string;
  trainingType?: string;
  sceneCount?: number;
  customTopics?: any[];
  scenes?: ISceneInput[]; // Allow passing pre-configured scenes
  voiceConfig?: IVoiceConfig;
  themeConfig?: IThemeConfig;
  brandCustomization?: any; // Flexible brand customization
}

export interface IVoiceConfig {
  voiceId: string;
  voiceName: string;
  language?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  settings?: any; // Flexible settings object
}

export interface IThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
}

export interface IVideoProject {
  id: string;
  name: string;
  prompt: string;
  status: string;
  scenes: ISceneInput[];
  template?: any;
  createdAt?: Date;
}

export interface ISceneInput {
  type?: string; // Scene type (for component compatibility)
  title?: string;
  content?: any; // Flexible content object
  
  // Backend fields (optional for component)
  scene_number?: number;
  scene_type?: string;
  layout?: string;
  subtitle?: string;
  body?: string;
  eyebrow?: string;
  narration?: string;
  bullets?: string[];
  cards?: any[];
  timeline_items?: any[];
  icon_items?: any[];
  stat_value?: string;
  stat_label?: string;
  quote?: string;
  quote_author?: string;
  bg_type?: string;
  gradient?: string;
  asset_url?: string;
  asset_type?: string;
  asset_keywords?: string;
}

export interface IGenerationProgress {
  stage: string;
  progress: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoGeneratorService {
  private apiUrl = environment.apiUrl;
  private progressSubject = new Subject<IGenerationProgress>();

  constructor(private http: HttpClient) {}

  /**
   * Get generation progress observable
   */
  getGenerationProgress(): Observable<IGenerationProgress> {
    return this.progressSubject.asObservable();
  }

  /**
   * Generate topics with AI
   */
  generateTopics(subject: string, trainingType: string = 'compliance'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ai/topics`, {
      subject,
      trainingType
    }).pipe(
      catchError(error => {
        console.error('Error generating topics:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Generate complete video with AI
   */
  generateVideo(config: IVideoGenerationConfig): Observable<IVideoProject> {
    console.log('🎬 Generating video with config:', config);

    // Emit progress
    this.progressSubject.next({
      stage: 'Initializing',
      progress: 10,
      message: 'Starting video generation...'
    });

    const requestBody = {
      subject: config.subject,
      courseName: config.projectName,
      trainingType: config.trainingType || 'compliance',
      topics: config.customTopics || [],
      sceneCount: config.sceneCount || 15,
      voiceConfig: config.voiceConfig,
      brandColors: config.themeConfig
    };

    this.progressSubject.next({
      stage: 'Generating',
      progress: 30,
      message: 'Generating scenes with AI...'
    });

    return this.http.post<any>(`${this.apiUrl}/ai/generate-video`, requestBody).pipe(
      map(response => {
        if (response.success) {
          this.progressSubject.next({
            stage: 'Finalizing',
            progress: 90,
            message: 'Finalizing video...'
          });

          // Transform backend response to match component expectations
          const project: IVideoProject = {
            id: response.project.id,
            name: response.project.name,
            prompt: response.project.prompt,
            status: response.project.status,
            scenes: response.project.scenes.map((scene: any, index: number) => {
              // Create content object for component compatibility
              const content: any = {
                headline: scene.title,
                subtitle: scene.subtitle,
                body: scene.body,
                voiceOverScript: scene.narration,
                bulletPoints: scene.bullets || [],
                statValue: scene.statValue,
                statLabel: scene.statLabel,
                quote: scene.quote,
                quoteAuthor: scene.quoteAuthor
              };

              return {
                type: scene.type,
                title: scene.title,
                content: content,
                scene_number: index + 1,
                scene_type: scene.type,
                layout: scene.layout,
                subtitle: scene.subtitle,
                body: scene.body,
                eyebrow: scene.eyebrow,
                narration: scene.narration,
                bullets: scene.bullets,
                cards: scene.cards,
                timeline_items: scene.timelineItems,
                icon_items: scene.iconItems,
                stat_value: scene.statValue,
                stat_label: scene.statLabel,
                quote: scene.quote,
                quote_author: scene.quoteAuthor,
                bg_type: scene.bgType,
                gradient: scene.gradient,
                asset_url: scene.asset?.url,
                asset_type: scene.asset?.type,
                asset_keywords: scene.assetKeywords
              };
            }),
            createdAt: new Date(response.project.created_at)
          };

          this.progressSubject.next({
            stage: 'Complete',
            progress: 100,
            message: 'Video generated successfully!'
          });

          console.log('✅ Video generated successfully:', project);
          return project;
        } else {
          throw new Error('Video generation failed');
        }
      }),
      catchError(error => {
        console.error('❌ Error generating video:', error);
        this.progressSubject.next({
          stage: 'Error',
          progress: 0,
          message: 'Video generation failed: ' + error.message
        });
        throw error;
      })
    );
  }

  /**
   * Get all projects
   */
  getProjects(): Observable<IVideoProject[]> {
    return this.http.get<any>(`${this.apiUrl}/projects`).pipe(
      map(response => response.success ? response.projects : []),
      catchError(error => {
        console.error('Error fetching projects:', error);
        return of([]);
      })
    );
  }

  /**
   * Get project by ID
   */
  getProject(id: string): Observable<IVideoProject> {
    return this.http.get<any>(`${this.apiUrl}/projects/${id}`).pipe(
      map(response => response.success ? response.project : null),
      catchError(error => {
        console.error('Error fetching project:', error);
        throw error;
      })
    );
  }

  /**
   * Generate HTML for video player
   */
  generateHTML(project: IVideoProject): string {
    let scenesHTML = '';

    project.scenes.forEach((scene, index) => {
      let bgHTML = '';
      
      if (scene.bg_type === 'video' && scene.asset_url) {
        bgHTML = `<div class="scene-bg"><video autoplay loop muted><source src="${scene.asset_url}" type="video/mp4"></video></div>`;
      } else if (scene.bg_type === 'image' && scene.asset_url) {
        bgHTML = `<div class="scene-bg" style="background-image: url('${scene.asset_url}'); background-size: cover;"></div>`;
      } else if (scene.bg_type === 'gradient' && scene.gradient) {
        bgHTML = `<div class="scene-bg" style="background: ${scene.gradient};"></div>`;
      }

      let contentHTML = `<div class="scene-content">`;
      
      if (scene.eyebrow) {
        contentHTML += `<div class="chapter-tag">${this.escapeHtml(scene.eyebrow)}</div>`;
      }
      
      if (scene.title) {
        contentHTML += `<h1 class="headline">${this.escapeHtml(scene.title)}</h1>`;
      }
      
      if (scene.subtitle) {
        contentHTML += `<p class="subtitle">${this.escapeHtml(scene.subtitle)}</p>`;
      }
      
      if (scene.body) {
        contentHTML += `<p class="body-text">${this.escapeHtml(scene.body)}</p>`;
      }
      
      if (scene.bullets && scene.bullets.length > 0) {
        contentHTML += `<ul class="bullet-list">`;
        scene.bullets.forEach(bullet => {
          contentHTML += `<li>${this.escapeHtml(bullet)}</li>`;
        });
        contentHTML += `</ul>`;
      }
      
      if (scene.stat_value && scene.stat_label) {
        contentHTML += `<div class="stat"><div class="stat-value">${this.escapeHtml(scene.stat_value)}</div><div class="stat-label">${this.escapeHtml(scene.stat_label)}</div></div>`;
      }
      
      if (scene.quote && scene.quote_author) {
        contentHTML += `<blockquote class="quote"><p>"${this.escapeHtml(scene.quote)}"</p><cite>— ${this.escapeHtml(scene.quote_author)}</cite></blockquote>`;
      }
      
      contentHTML += `</div>`;
      
      scenesHTML += `<div class="scene" data-scene="${index}">${bgHTML}<div class="scene-overlay"></div>${contentHTML}</div>`;
    });

    const title = this.escapeHtml(project.name);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #000; color: #fff; overflow: hidden; }
    .video-container { width: 100vw; height: 100vh; position: relative; }
    .scene { position: absolute; inset: 0; opacity: 0; transition: opacity 0.8s; }
    .scene.active { opacity: 1; }
    .scene-bg { position: absolute; inset: 0; }
    .scene-bg video { width: 100%; height: 100%; object-fit: cover; }
    .scene-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%); }
    .scene-content { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 60px; z-index: 1; }
    .chapter-tag { font-size: 14px; text-transform: uppercase; letter-spacing: 3px; color: #e63946; margin-bottom: 20px; font-weight: 600; }
    .headline { font-size: clamp(32px, 5vw, 64px); font-weight: 700; margin-bottom: 20px; line-height: 1.2; }
    .subtitle { font-size: clamp(16px, 2vw, 24px); opacity: 0.9; max-width: 800px; line-height: 1.5; }
    .body-text { font-size: 18px; max-width: 700px; margin-top: 20px; line-height: 1.6; opacity: 0.85; }
    .bullet-list { list-style: none; max-width: 700px; margin-top: 30px; text-align: left; }
    .bullet-list li { font-size: 18px; padding: 12px 0; padding-left: 30px; position: relative; }
    .bullet-list li::before { content: '•'; position: absolute; left: 0; color: #e63946; font-size: 24px; }
    .stat { margin-top: 40px; }
    .stat-value { font-size: clamp(48px, 8vw, 96px); font-weight: 700; color: #e63946; }
    .stat-label { font-size: 20px; margin-top: 10px; opacity: 0.8; }
    .quote { max-width: 800px; margin-top: 40px; font-size: 24px; font-style: italic; line-height: 1.6; }
    .quote cite { display: block; margin-top: 20px; font-size: 18px; opacity: 0.7; font-style: normal; }
    .controls { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 20px; display: flex; align-items: center; gap: 20px; z-index: 10; }
    .btn { background: #e63946; border: none; color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
    .btn:hover { background: #d62839; transform: translateY(-2px); }
    .progress { flex: 1; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; cursor: pointer; }
    .progress-fill { height: 100%; background: #e63946; border-radius: 3px; transition: width 0.3s; }
    .time { font-size: 14px; opacity: 0.8; min-width: 100px; text-align: right; }
  </style>
</head>
<body>
  <div class="video-container">${scenesHTML}</div>
  <div class="controls">
    <button class="btn" id="playBtn">▶ Play</button>
    <button class="btn" id="prevBtn">◀</button>
    <button class="btn" id="nextBtn">▶</button>
    <div class="progress" id="progressBar"><div class="progress-fill" id="progress"></div></div>
    <div class="time" id="time">Scene 1 of ${project.scenes.length}</div>
  </div>
  <script>
    const scenes = document.querySelectorAll('.scene');
    let current = 0;
    let playing = false;
    let timer;
    
    function showScene(index) {
      scenes.forEach((scene, i) => scene.classList.toggle('active', i === index));
      current = index;
      document.getElementById('time').textContent = 'Scene ' + (current + 1) + ' of ' + scenes.length;
      document.getElementById('progress').style.width = ((current + 1) / scenes.length * 100) + '%';
    }
    
    function next() { showScene((current + 1) % scenes.length); }
    function prev() { showScene((current - 1 + scenes.length) % scenes.length); }
    
    function play() {
      playing = true;
      document.getElementById('playBtn').textContent = '⏸ Pause';
      timer = setInterval(() => {
        if (current < scenes.length - 1) next();
        else { pause(); showScene(0); }
      }, 5000);
    }
    
    function pause() {
      playing = false;
      document.getElementById('playBtn').textContent = '▶ Play';
      clearInterval(timer);
    }
    
    document.getElementById('playBtn').onclick = () => playing ? pause() : play();
    document.getElementById('nextBtn').onclick = next;
    document.getElementById('prevBtn').onclick = prev;
    document.getElementById('progressBar').onclick = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const sceneIndex = Math.floor(percentage * scenes.length);
      showScene(sceneIndex);
    };
    
    document.addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      if (e.code === 'ArrowRight') next();
      if (e.code === 'ArrowLeft') prev();
    });
    
    showScene(0);
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
