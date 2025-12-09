import { Router } from 'express';
import pexelsService from '../services/pexels.service';

const router = Router();

// POST /api/pexels/search-videos - Single result (existing)
router.post('/search-videos', async (req, res) => {
  try {
    const { query } = req.body;
    const asset = await pexelsService.fetchVideoAsset(query);
    res.json({ success: true, asset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pexels/search-images - Single result (existing)
router.post('/search-images', async (req, res) => {
  try {
    const { query } = req.body;
    const asset = await pexelsService.fetchImageAsset(query);
    res.json({ success: true, asset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pexels/videos - Multiple results for scene editor
router.get('/videos', async (req, res) => {
  try {
    const query = req.query.query as string;
    const perPage = parseInt(req.query.per_page as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY || ''
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }
    
    const data: any = await response.json();
    res.json(data.videos || []);
  } catch (error: any) {
    console.error('Pexels videos error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pexels/images - Multiple results for scene editor
router.get('/images', async (req, res) => {
  try {
    const query = req.query.query as string;
    const perPage = parseInt(req.query.per_page as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY || ''
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }
    
    const data: any = await response.json();
    res.json(data.photos || []);
  } catch (error: any) {
    console.error('Pexels images error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;