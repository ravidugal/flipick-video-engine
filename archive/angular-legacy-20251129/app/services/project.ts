import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Project, Scene } from '../models/project';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private currentProjectSubject = new BehaviorSubject<Project | null>(null);
  private scenesSubject = new BehaviorSubject<Scene[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  currentProject$ = this.currentProjectSubject.asObservable();
  scenes$ = this.scenesSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  setCurrentProject(project: Project | null): void {
    this.currentProjectSubject.next(project);
  }

  getCurrentProject(): Project | null {
    return this.currentProjectSubject.value;
  }

  setScenes(scenes: Scene[]): void {
    this.scenesSubject.next(scenes);
  }

  getScenes(): Scene[] {
    return this.scenesSubject.value;
  }

  updateScene(updatedScene: Scene): void {
    const scenes = this.scenesSubject.value.map(scene => 
      scene.id === updatedScene.id ? updatedScene : scene
    );
    this.scenesSubject.next(scenes);
  }

  addScene(scene: Scene): void {
    const scenes = [...this.scenesSubject.value, scene];
    this.scenesSubject.next(scenes);
  }

  removeScene(sceneId: string): void {
    const scenes = this.scenesSubject.value.filter(scene => scene.id !== sceneId);
    this.scenesSubject.next(scenes);
  }

  reorderScenes(fromIndex: number, toIndex: number): void {
    const scenes = [...this.scenesSubject.value];
    const [movedScene] = scenes.splice(fromIndex, 1);
    scenes.splice(toIndex, 0, movedScene);
    
    scenes.forEach((scene, index) => {
      scene.order = index + 1;
    });
    
    this.scenesSubject.next(scenes);
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  setError(error: string | null): void {
    this.errorSubject.next(error);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  reset(): void {
    this.currentProjectSubject.next(null);
    this.scenesSubject.next([]);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
  }
}