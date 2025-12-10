import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { Project } from '../../models/project';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  projects: Project[] = [];
  loading = true;
  error: string | null = null;
  apiConnected = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkApiConnection();
    this.loadProjects();
  }

  checkApiConnection(): void {
    this.apiService.healthCheck().subscribe({
      next: (response) => {
        this.apiConnected = response.status === 'ok';
        this.cdr.detectChanges();
      },
      error: () => {
        this.apiConnected = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadProjects(): void {
    this.loading = true;
    this.apiService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.projects || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load projects';
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error loading projects:', err);
      }
    });
  }

  createNewProject(): void {
    this.router.navigate(['/create']);
  }

  openProject(project: Project): void {
    this.router.navigate(['/editor', project.id]);
  }

  deleteProject(project: Project, event: Event): void {
    event.stopPropagation();
    if (confirm(`Delete "${project.title}"?`)) {
      this.apiService.deleteProject(project.id).subscribe({
        next: () => {
          this.projects = this.projects.filter(p => p.id !== project.id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting project:', err);
          alert('Failed to delete project');
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'generating': return 'status-generating';
      case 'error': return 'status-error';
      default: return 'status-draft';
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}