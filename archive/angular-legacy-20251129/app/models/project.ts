export interface Project {
  id: string;
  prompt: string;
  title: string;
  status: 'draft' | 'generating' | 'completed' | 'error';
  sceneCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scene {
  id: string;
  projectId: string;
  order: number;
  title: string;
  content: string;
  design: SceneDesign;
  voiceoverUrl?: string;
  videoUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface SceneDesign {
  layout: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: string;
  animation: string;
  backgroundImage?: string;
  overlayOpacity?: number;
}

export interface GenerateScenesRequest {
  prompt: string;
  sceneCount: number;
}

export interface GenerateScenesResponse {
  success: boolean;
  scenes: { order: number; title: string }[];
}

export interface GenerateContentRequest {
  sceneTitle: string;
  sceneOrder: number;
  totalScenes: number;
  projectPrompt: string;
}

export interface GenerateContentResponse {
  success: boolean;
  content: string;
}

export interface GenerateDesignRequest {
  sceneTitle: string;
  sceneContent: string;
  sceneOrder: number;
}

export interface GenerateDesignResponse {
  success: boolean;
  design: SceneDesign;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}