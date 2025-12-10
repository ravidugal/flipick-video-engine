import axios from 'axios';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

class PexelsService {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com/v1';
  private videoBaseUrl = 'https://api.pexels.com/videos';

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('❌ Pexels API key not found in environment variables');
      console.error('Please add PEXELS_API_KEY to your .env file');
    } else {
      console.log('✅ Pexels service initialized with API key');
    }
  }

  async fetchImageAsset(keywords: string): Promise<{ id: number; url: string } | null> {
    if (!this.apiKey) {
      console.warn('⚠️ No Pexels API key configured');
      return null;
    }

    try {
      const query = keywords || 'business professional';
      console.log(`🔍 Fetching image from Pexels: "${query}"`);

      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: {
          'Authorization': this.apiKey
        },
        params: {
          query: query,
          per_page: 15,
          orientation: 'landscape'
        }
      });

      if (response.data && response.data.photos && response.data.photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(response.data.photos.length, 10));
        const photo: PexelsPhoto = response.data.photos[randomIndex];
        
        console.log(`✅ Found Pexels image: ${photo.id} (${photo.width}x${photo.height})`);
        
        return {
          id: photo.id,
          url: photo.src.large2x
        };
      } else {
        console.log(`⚠️ No images found for "${query}"`);
        return null;
      }
    } catch (error: any) {
      console.error('❌ Pexels image fetch error:', error.message);
      return null;
    }
  }

  async fetchVideoAsset(keywords: string): Promise<{ id: number; url: string } | null> {
    if (!this.apiKey) {
      console.warn('⚠️ No Pexels API key configured');
      return null;
    }

    try {
      const query = keywords || 'business professional';
      console.log(`🎥 Fetching video from Pexels: "${query}"`);

      const response = await axios.get(`${this.videoBaseUrl}/search`, {
        headers: {
          'Authorization': this.apiKey
        },
        params: {
          query: query,
          per_page: 15,
          orientation: 'landscape'
        }
      });

      if (response.data && response.data.videos && response.data.videos.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(response.data.videos.length, 10));
        const video: PexelsVideo = response.data.videos[randomIndex];
        
        const hdFile = video.video_files.find(f => f.width === 1920 && f.height === 1080) ||
                       video.video_files.find(f => f.quality === 'hd') ||
                       video.video_files[0];
        
        console.log(`✅ Found Pexels video: ${video.id} (${hdFile.width}x${hdFile.height})`);
        
        return {
          id: video.id,
          url: hdFile.link
        };
      } else {
        console.log(`⚠️ No videos found for "${query}"`);
        return null;
      }
    } catch (error: any) {
      console.error('❌ Pexels video fetch error:', error.message);
      return null;
    }
  }
}

const pexelsService = new PexelsService();
export default pexelsService;