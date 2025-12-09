import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project';
import { Scene, Project } from '../../models/project';

@Component({
  selector: 'app-video-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-preview.html',
  styleUrl: './video-preview.scss'
})
export class VideoPreview implements OnInit, OnDestroy {
  project: Project | null = null;
  scenes: Scene[] = [];
  currentSceneIndex = 0;
  isPlaying = false;
  progress = 0;
  
  private playInterval: any;
  private progressInterval: any;
  private sceneDuration = 5000;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.project = this.projectService.getCurrentProject();
    this.scenes = this.projectService.getScenes();
    
    if (this.scenes.length === 0) {
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  get currentScene(): Scene | null {
    return this.scenes[this.currentSceneIndex] || null;
  }

  get totalDuration(): number {
    return this.scenes.length * this.sceneDuration;
  }

  get currentTime(): number {
    return (this.currentSceneIndex * this.sceneDuration) + (this.progress / 100 * this.sceneDuration);
  }

  play(): void {
    if (this.currentSceneIndex >= this.scenes.length - 1 && this.progress >= 100) {
      this.currentSceneIndex = 0;
      this.progress = 0;
    }
    
    this.isPlaying = true;
    this.startProgress();
  }

  pause(): void {
    this.isPlaying = false;
    this.clearIntervals();
  }

  stop(): void {
    this.isPlaying = false;
    this.currentSceneIndex = 0;
    this.progress = 0;
    this.clearIntervals();
  }

  private startProgress(): void {
    this.clearIntervals();
    
    const updateInterval = 50;
    const progressIncrement = (updateInterval / this.sceneDuration) * 100;
    
    this.progressInterval = setInterval(() => {
      this.progress += progressIncrement;
      
      if (this.progress >= 100) {
        this.progress = 0;
        this.nextScene();
      }
    }, updateInterval);
  }

  private clearIntervals(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  nextScene(): void {
    if (this.currentSceneIndex < this.scenes.length - 1) {
      this.currentSceneIndex++;
      this.progress = 0;
    } else {
      this.pause();
      this.progress = 100;
    }
  }

  previousScene(): void {
    if (this.currentSceneIndex > 0) {
      this.currentSceneIndex--;
      this.progress = 0;
    }
  }

  goToScene(index: number): void {
    this.currentSceneIndex = index;
    this.progress = 0;
    if (this.isPlaying) {
      this.startProgress();
    }
  }

  goBack(): void {
    this.stop();
    this.router.navigate(['/editor', this.project?.id]);
  }

  goToDashboard(): void {
    this.stop();
    this.projectService.reset();
    this.router.navigate(['/']);
  }

  getPreviewStyle(): Record<string, string> {
    if (!this.currentScene?.design) {
      return {
        'background': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      };
    }
    
    const design = this.currentScene.design;
    return {
      'background-color': design.backgroundColor || '#1a1a2e',
      'color': design.textColor || '#ffffff',
      'font-family': design.fontFamily || 'Inter'
    };
  }

  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getOverallProgress(): number {
    const sceneProgress = this.currentSceneIndex / this.scenes.length;
    const withinSceneProgress = this.progress / 100 / this.scenes.length;
    return (sceneProgress + withinSceneProgress) * 100;
  }
}