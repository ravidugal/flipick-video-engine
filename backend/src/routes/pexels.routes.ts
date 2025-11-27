import { Router } from 'express';
import pexelsService from '../services/pexels.service';

const router = Router();

// POST /api/pexels/search-videos
router.post('/search-videos', async (req, res) => {
  try {
    const { query } = req.body;
    const asset = await pexelsService.fetchVideoAsset(query);
    res.json({ success: true, asset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pexels/search-images
router.post('/search-images', async (req, res) => {
  try {
    const { query } = req.body;
    const asset = await pexelsService.fetchImageAsset(query);
    res.json({ success: true, asset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
