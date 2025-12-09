import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { ProjectService } from '../../services/project';
import { Scene, Project } from '../../models/project';

@Component({
  selector: 'app-scene-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scene-editor.html',
  styleUrl: './scene-editor.scss'
})
export class SceneEditor implements OnInit {
  project: Project | null = null;
  scenes: Scene[] = [];
  selectedScene: Scene | null = null;
  selectedIndex = 0;
  
  loading = false;
  saving = false;
  regenerating = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.project = this.projectService.getCurrentProject();
    this.scenes = this.projectService.getScenes();
    
    if (this.scenes.length > 0) {
      this.selectedScene = this.scenes[0];
      this.selectedIndex = 0;
    }

    if (!this.project) {
      const projectId = this.route.snapshot.paramMap.get('id');
      if (projectId) {
        this.loadProject(projectId);
      }
    }
  }

  loadProject(projectId: string): void {
    this.loading = true;
    this.apiService.getProject(projectId).subscribe({
      next: (response) => {
        if (response.success) {
          this.project = response.project;
          this.loadScenes(projectId);
        }
      },
      error: (err) => {
        console.error('Error loading project:', err);
        this.loading = false;
      }
    });
  }

  loadScenes(projectId: string): void {
    this.apiService.getScenes(projectId).subscribe({
      next: (response) => {
        if (response.success) {
          this.scenes = response.scenes;
          if (this.scenes.length > 0) {
            this.selectedScene = this.scenes[0];
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading scenes:', err);
        this.loading = false;
      }
    });
  }

  selectScene(scene: Scene, index: number): void {
    this.selectedScene = { ...scene };
    this.selectedIndex = index;
  }

  saveScene(): void {
    if (!this.selectedScene || !this.project) return;
    
    this.saving = true;
    
    this.scenes[this.selectedIndex] = { ...this.selectedScene };
    this.projectService.setScenes(this.scenes);
    
    this.apiService.updateScene(this.project.id, this.selectedScene.id, this.selectedScene).subscribe({
      next: () => {
        this.saving = false;
      },
      error: (err) => {
        console.error('Error saving scene:', err);
        this.saving = false;
      }
    });
  }

  async regenerateContent(): Promise<void> {
    if (!this.selectedScene || !this.project) return;
    
    this.regenerating = true;
    
    try {
      const response = await this.apiService.generateContent({
        sceneTitle: this.selectedScene.title,
        sceneOrder: this.selectedScene.order,
        totalScenes: this.scenes.length,
        projectPrompt: this.project.prompt
      }).toPromise();

      if (response?.success) {
        this.selectedScene.content = response.content;
        this.saveScene();
      }
    } catch (err) {
      console.error('Error regenerating content:', err);
    } finally {
      this.regenerating = false;
    }
  }

  async regenerateDesign(): Promise<void> {
    if (!this.selectedScene) return;
    
    this.regenerating = true;
    
    try {
      const response = await this.apiService.generateDesign({
        sceneTitle: this.selectedScene.title,
        sceneContent: this.selectedScene.content,
        sceneOrder: this.selectedScene.order
      }).toPromise();

      if (response?.success) {
        this.selectedScene.design = response.design;
        this.saveScene();
      }
    } catch (err) {
      console.error('Error regenerating design:', err);
    } finally {
      this.regenerating = false;
    }
  }

  previewVideo(): void {
    this.router.navigate(['/preview', this.project?.id]);
  }

  goBack(): void {
    this.projectService.reset();
    this.router.navigate(['/']);
  }

  getPreviewStyle(): Record<string, string> {
  if (!this.selectedScene?.design) {
    return {
      'background': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
    };
  }
  
  const design = this.selectedScene.design as any;
  const theme = design.theme || {};
  
  const styles: Record<string, string> = {};
  
  if (theme.backgroundGradient) {
    styles['background'] = theme.backgroundGradient;
  } else if (theme.backgroundColor) {
    styles['background-color'] = theme.backgroundColor;
  } else if (design.backgroundColor) {
    styles['background-color'] = design.backgroundColor;
  } else {
    styles['background'] = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
  }
  
  return styles;
}

getContentStyle(): Record<string, string> {
  const design = this.selectedScene?.design as any;
  if (!design) return {};
  
  const layout = design.layout || 'centered';
  const styles: Record<string, string> = {};
  
  switch (layout) {
    case 'asymmetric':
      styles['text-align'] = 'left';
      styles['padding-left'] = '10%';
      styles['padding-right'] = '20%';
      break;
    case 'split':
      styles['text-align'] = 'left';
      styles['padding-left'] = '5%';
      styles['max-width'] = '50%';
      break;
    case 'hero':
      styles['text-align'] = 'center';
      break;
    default:
      styles['text-align'] = 'center';
  }
  
  return styles;
}

getTitleStyle(): Record<string, string> {
  const design = this.selectedScene?.design as any;
  if (!design) return { 'color': '#ffffff' };
  
  const theme = design.theme || {};
  const typography = design.typography || {};
  
  return {
    'color': theme.textColor || design.textColor || '#ffffff',
    'font-size': (typography.titleFontSize || 48) + 'px',
    'font-weight': String(typography.titleFontWeight || 700),
    'font-family': typography.fontFamily || 'Inter, sans-serif',
    'line-height': '1.2',
    'margin-bottom': '1.5rem'
  };
}

getTextStyle(): Record<string, string> {
  const design = this.selectedScene?.design as any;
  if (!design) return { 'color': 'rgba(255,255,255,0.9)' };
  
  const theme = design.theme || {};
  const typography = design.typography || {};
  
  return {
    'color': theme.textColor || design.textColor || 'rgba(255,255,255,0.9)',
    'font-size': (typography.contentFontSize || 20) + 'px',
    'font-family': typography.fontFamily || 'Inter, sans-serif',
    'line-height': '1.8',
    'max-width': '800px'
  };
}

previousScene(): void {
  if (this.selectedIndex > 0) {
    this.selectScene(this.scenes[this.selectedIndex - 1], this.selectedIndex - 1);
  }
}

nextScene(): void {
  if (this.selectedIndex < this.scenes.length - 1) {
    this.selectScene(this.scenes[this.selectedIndex + 1], this.selectedIndex + 1);
  }
}
}