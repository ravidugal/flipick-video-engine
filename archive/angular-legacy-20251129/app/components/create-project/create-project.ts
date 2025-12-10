import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { ProjectService } from '../../services/project';
import { Scene, SceneDesign } from '../../models/project';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-project.html',
  styleUrl: './create-project.scss'
})
export class CreateProject {
  prompt = '';
  title = '';
  sceneCount = 6;
  
  currentStep = 1;
  loading = false;
  loadingMessage = '';
  error: string | null = null;
  
  generatedScenes: { order: number; title: string; content?: string; design?: SceneDesign }[] = [];
  currentGeneratingScene = 0;

  constructor(
    private apiService: ApiService,
    private projectService: ProjectService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  goBack(): void {
    this.router.navigate(['/']);
  }

  async startGeneration(): Promise<void> {
    if (!this.prompt.trim()) {
      this.error = 'Please enter a prompt for your video';
      return;
    }

    this.error = null;
    this.loading = true;
    this.currentStep = 2;
    this.cdr.detectChanges();

    try {
      this.loadingMessage = 'Generating scene titles...';
      this.cdr.detectChanges();
      
      const scenesResponse = await this.apiService.generateScenes({
        prompt: this.prompt,
        sceneCount: this.sceneCount
      }).toPromise();

      if (!scenesResponse?.success || !scenesResponse.scenes) {
        throw new Error('Failed to generate scenes');
      }

      this.generatedScenes = scenesResponse.scenes.map(s => ({
        order: s.order,
        title: s.title
      }));
      this.cdr.detectChanges();

      for (let i = 0; i < this.generatedScenes.length; i++) {
        this.currentGeneratingScene = i + 1;
        this.loadingMessage = `Generating content for scene ${i + 1} of ${this.generatedScenes.length}...`;
        this.cdr.detectChanges();

        const contentResponse = await this.apiService.generateContent({
          sceneTitle: this.generatedScenes[i].title,
          sceneOrder: i + 1,
          totalScenes: this.generatedScenes.length,
          projectPrompt: this.prompt
        }).toPromise();

        if (contentResponse?.success) {
          this.generatedScenes[i].content = contentResponse.content;
        }
        this.cdr.detectChanges();

        this.loadingMessage = `Generating design for scene ${i + 1} of ${this.generatedScenes.length}...`;
        this.cdr.detectChanges();

        const designResponse = await this.apiService.generateDesign({
          sceneTitle: this.generatedScenes[i].title,
          sceneContent: this.generatedScenes[i].content || '',
          sceneOrder: i + 1
        }).toPromise();

        if (designResponse?.success) {
          this.generatedScenes[i].design = designResponse.design;
        }
        this.cdr.detectChanges();
      }

      this.loadingMessage = 'Saving project...';
      this.cdr.detectChanges();
      
      const projectTitle = this.title || this.prompt.substring(0, 50);
      
      const projectResponse = await this.apiService.createProject({
        prompt: this.prompt,
        title: projectTitle,
        scenes: this.generatedScenes.map((s, idx) => ({
          sceneNumber: idx + 1,
          title: s.title,
          content: s.content || '',
          design: s.design,
          duration: 15.0
        }))
      }).toPromise();

      if (projectResponse?.success && projectResponse.project) {
        this.projectService.setCurrentProject(projectResponse.project);
        console.log('Generated scenes with designs:', JSON.stringify(this.generatedScenes, null, 2));        
        const scenes: Scene[] = this.generatedScenes.map((s, idx) => ({
          id: `temp-${idx}`,
          projectId: projectResponse.project.id,
          order: s.order,
          title: s.title,
          content: s.content || '',
          design: s.design || this.getDefaultDesign(),
          status: 'completed' as const
        }));
        
        this.projectService.setScenes(scenes);
        this.router.navigate(['/editor', projectResponse.project.id]);
      }

    } catch (err: any) {
      console.error('Generation error:', err);
      this.error = err.message || 'Failed to generate video content';
      this.currentStep = 1;
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  getDefaultDesign(): SceneDesign {
    return {
      layout: 'centered',
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      fontSize: '24px',
      animation: 'fadeIn'
    };
  }

  getProgress(): number {
    if (this.generatedScenes.length === 0) return 10;
    const scenesGenerated = this.generatedScenes.filter(s => s.content && s.design).length;
    return Math.round((scenesGenerated / this.sceneCount) * 90) + 10;
  }
}