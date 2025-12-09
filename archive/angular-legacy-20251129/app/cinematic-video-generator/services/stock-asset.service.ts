import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

export interface IStockVideo {
  id: string;
  url: string;
  thumbnail: string;
  duration: number;
  width: number;
  height: number;
  source: string;
}

export interface ISceneAssets {
  primaryVideo?: IStockVideo;
  fallbackImage?: any;
  additionalImages: any[];
}

@Injectable({
  providedIn: 'root'
})
export class StockAssetService {

  private apiUrl = 'http://localhost:3000/api/pexels';
  private videoCache = new Map<string, IStockVideo[]>();

  private fallbackVideos: IStockVideo[] = [
    { id: 'fallback-1', url: 'https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4', thumbnail: '', duration: 30, width: 1920, height: 1080, source: 'curated' },
    { id: 'fallback-2', url: 'https://videos.pexels.com/video-files/7534240/7534240-hd_1920_1080_25fps.mp4', thumbnail: '', duration: 30, width: 1920, height: 1080, source: 'curated' },
    { id: 'fallback-3', url: 'https://videos.pexels.com/video-files/3252128/3252128-hd_1920_1080_24fps.mp4', thumbnail: '', duration: 30, width: 1920, height: 1080, source: 'curated' }
  ];

  constructor(private http: HttpClient) {}

  searchVideos(query: string, perPage: number = 5): Observable<IStockVideo[]> {
    const cacheKey = `${query}-${perPage}`;
    
    if (this.videoCache.has(cacheKey)) {
      return of(this.videoCache.get(cacheKey)!);
    }

    return this.http.get<IStockVideo[]>(`${this.apiUrl}/videos`, {
      params: { query, per_page: perPage.toString() }
    }).pipe(
      timeout(10000),
      map(videos => {
        this.videoCache.set(cacheKey, videos);
        console.log(`Fetched ${videos.length} videos for "${query}"`);
        return videos;
      }),
      catchError(err => {
        console.warn('Video fetch failed, using fallbacks:', err.message);
        return of(this.fallbackVideos);
      })
    );
  }

  getAssetsForScene(title: string, content: string, sceneType: string): Observable<ISceneAssets> {
    const query = this.buildQuery(sceneType);
    
    return this.searchVideos(query, 3).pipe(
      map(videos => ({
        primaryVideo: videos[0] || this.fallbackVideos[0],
        fallbackImage: undefined,
        additionalImages: []
      })),
      catchError(() => of({
        primaryVideo: this.fallbackVideos[0],
        fallbackImage: undefined,
        additionalImages: []
      }))
    );
  }

  private buildQuery(sceneType: string): string {
    const queries: Record<string, string> = {
      'title': 'corporate business presentation',
      'chapter': 'professional team meeting',
      'statistics': 'data analytics dashboard',
      'split': 'business discussion office',
      'list': 'professional training workshop',
      'scenario': 'workplace conversation',
      'action': 'team collaboration success',
      'closing': 'business achievement celebration'
    };
    return queries[sceneType] || 'professional business workplace';
  }

  clearCache(): void {
    this.videoCache.clear();
  }
}
