import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Project, 
  Scene, 
  GenerateScenesRequest, 
  GenerateScenesResponse,
  GenerateContentRequest,
  GenerateContentResponse,
  GenerateDesignRequest,
  GenerateDesignResponse
} from '../models/project';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Projects
  getProjects(): Observable<{ success: boolean; projects: Project[] }> {
    return this.http.get<{ success: boolean; projects: Project[] }>(`${this.baseUrl}/projects`);
  }

  getProject(id: string): Observable<{ success: boolean; project: Project }> {
    return this.http.get<{ success: boolean; project: Project }>(`${this.baseUrl}/projects/${id}`);
  }

  createProject(data: { prompt: string; title: string; scenes?: any[] }): Observable<{ success: boolean; project: Project }> {
    return this.http.post<{ success: boolean; project: Project }>(`${this.baseUrl}/projects`, {
      prompt: data.prompt,
      courseName: data.title,
      scenes: data.scenes || []
    });
  }

  updateProject(id: string, data: Partial<Project>): Observable<{ success: boolean; project: Project }> {
    return this.http.put<{ success: boolean; project: Project }>(`${this.baseUrl}/projects/${id}`, data);
  }

  deleteProject(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/projects/${id}`);
  }

  // Scenes
  getScenes(projectId: string): Observable<{ success: boolean; scenes: Scene[] }> {
    return this.http.get<{ success: boolean; scenes: Scene[] }>(`${this.baseUrl}/projects/${projectId}/scenes`);
  }

  updateScene(projectId: string, sceneId: string, data: Partial<Scene>): Observable<{ success: boolean; scene: Scene }> {
    return this.http.put<{ success: boolean; scene: Scene }>(`${this.baseUrl}/projects/${projectId}/scenes/${sceneId}`, data);
  }

  // AI Generation
  generateScenes(data: GenerateScenesRequest): Observable<GenerateScenesResponse> {
    return this.http.post<GenerateScenesResponse>(`${this.baseUrl}/ai/generate-scenes`, {
      prompt: data.prompt,
      numScenes: data.sceneCount
    });
  }

  generateContent(data: GenerateContentRequest): Observable<GenerateContentResponse> {
    return this.http.post<GenerateContentResponse>(`${this.baseUrl}/ai/generate-content`, {
      prompt: data.projectPrompt,
      sceneTitle: data.sceneTitle,
      sceneNumber: data.sceneOrder,
      totalScenes: data.totalScenes
    });
  }

  generateDesign(data: GenerateDesignRequest): Observable<GenerateDesignResponse> {
    return this.http.post<GenerateDesignResponse>(`${this.baseUrl}/ai/generate-design`, {
      sceneTitle: data.sceneTitle,
      content: data.sceneContent,
      sceneNumber: data.sceneOrder
    });
  }

  // Health check
  healthCheck(): Observable<{ status: string; message: string }> {
    return this.http.get<{ status: string; message: string }>('http://localhost:3000/health');
  }
}