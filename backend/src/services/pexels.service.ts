import axios from 'axios';
import { config } from '../config/env';

interface PexelsAsset {
  type: 'video' | 'image';
  url: string;
  thumbnail?: string;
  id: number;
}

export class PexelsService {
  private apiKey = config.apiKeys.pexels || '';
  private usedVideoIds = new Set<number>();
  private usedImageIds = new Set<number>();

  /**
   * Fetch video asset
   */
  async fetchVideoAsset(keywords: string): Promise<PexelsAsset | null> {
    if (!this.apiKey) {
      console.log('⚠️ No Pexels API key configured');
      return null;
    }

    try {
      const response = await axios.get('https://api.pexels.com/videos/search', {
        headers: { Authorization: this.apiKey },
        params: { 
          query: keywords, 
          per_page: 15, 
          orientation: 'landscape' 
        },
        timeout: 8000
      });

      if (response.data.videos && response.data.videos.length > 0) {
        // Filter out already used videos
        const available = response.data.videos.filter(
          (v: any) => !this.usedVideoIds.has(v.id)
        );
        
        const video = available.length > 0 
          ? available[Math.floor(Math.random() * Math.min(5, available.length))]
          : response.data.videos[0];
        
        this.usedVideoIds.add(video.id);
        
        // Find HD quality file
        const hdFile = video.video_files.find(
          (f: any) => f.quality === 'hd' && f.width >= 1280
        ) || video.video_files[0];

        return {
          type: 'video',
          url: hdFile.link,
          thumbnail: video.image,
          id: video.id
        };
      }

      return null;
    } catch (error: any) {
      console.error('❌ Pexels video error:', error.message);
      return null;
    }
  }

  /**
   * Fetch image asset
   */
  async fetchImageAsset(keywords: string): Promise<PexelsAsset | null> {
    if (!this.apiKey) {
      console.log('⚠️ No Pexels API key configured');
      return null;
    }

    try {
      const response = await axios.get('https://api.pexels.com/v1/search', {
        headers: { Authorization: this.apiKey },
        params: { 
          query: keywords, 
          per_page: 15, 
          orientation: 'landscape' 
        },
        timeout: 8000
      });

      if (response.data.photos && response.data.photos.length > 0) {
        // Filter out already used images
        const available = response.data.photos.filter(
          (p: any) => !this.usedImageIds.has(p.id)
        );
        
        const photo = available.length > 0
          ? available[Math.floor(Math.random() * Math.min(5, available.length))]
          : response.data.photos[0];
        
        this.usedImageIds.add(photo.id);

        return {
          type: 'image',
          url: photo.src.large2x,
          thumbnail: photo.src.medium,
          id: photo.id
        };
      }

      return null;
    } catch (error: any) {
      console.error('❌ Pexels image error:', error.message);
      return null;
    }
  }

  /**
   * Fetch asset based on background type
   */
  async fetchAsset(keywords: string, bgType: 'video' | 'image' | 'gradient'): Promise<PexelsAsset | null> {
    if (bgType === 'gradient') {
      return null; // Gradients don't need assets
    }

    const cleanKeywords = keywords.replace(/[^\w\s]/g, ' ').trim() || 'professional business office';

    if (bgType === 'video') {
      return this.fetchVideoAsset(cleanKeywords);
    } else {
      return this.fetchImageAsset(cleanKeywords);
    }
  }

  /**
   * Reset used assets (call this at start of new video generation)
   */
  resetUsedAssets(): void {
    this.usedVideoIds.clear();
    this.usedImageIds.clear();
    console.log('🔄 Reset asset tracking');
  }
}

export default new PexelsService();
