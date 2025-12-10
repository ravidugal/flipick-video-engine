import { Request, Response } from 'express';
import pdfUploadService from '../services/pdf-upload.service';
import claudePDFService from '../services/claude-pdf.service';
import pexelsService from '../services/pexels.service';
import { pool } from '../config/database';

export class PDFController {
  
  async uploadPDF(req: Request, res: Response) {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.userId || 'default-user';
      const tenantId = (req as any).user?.tenantId || 'default-tenant';
      if (!req.file) return res.status(400).json({ success: false, error: 'No PDF file' });
      const upload = await pdfUploadService.uploadPDF(req.file.buffer, tenantId, userId);
      await pool.query('UPDATE projects SET pdf_url = $1, pdf_filename = $2, pdf_pages = $3, pdf_size_mb = $4, content_source_type = $5, updated_at = NOW() WHERE id = $6', [upload.gcsPath, req.file.originalname, upload.pages, upload.size / 1024 / 1024, 'pdf', projectId]);
      return res.json({ success: true, message: 'PDF uploaded', pdf: { filename: req.file.originalname, pages: upload.pages, sizeMB: (upload.size / 1024 / 1024).toFixed(2) } });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to upload PDF', message: error.message });
    }
  }

  async extractTopics(req: Request, res: Response) {
    try {
      const { projectId, sceneCount = 10 } = req.body;
      const projectResult = await pool.query('SELECT pdf_url, pdf_filename FROM projects WHERE id = $1', [projectId]);
      if (!projectResult.rows.length) return res.status(404).json({ success: false, error: 'Project not found' });
      const project = projectResult.rows[0];
      if (!project.pdf_url) return res.status(400).json({ success: false, error: 'No PDF uploaded' });
      const pdfBuffer = await pdfUploadService.getPDF(project.pdf_url);
      const topics = await claudePDFService.extractTopicsFromPDF(pdfBuffer, parseInt(sceneCount), '');
      return res.json({ success: true, topics: topics.map(t => ({ name: t.title, subtopics: t.keywords, pageNumbers: t.pageNumbers, description: t.description })) });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to extract topics', message: error.message });
    }
  }

  async generateVideoFromTopics(req: Request, res: Response) {
    try {
      const { projectId, topics } = req.body;
      if (!projectId || !topics || !Array.isArray(topics)) return res.status(400).json({ success: false, error: 'Project ID and topics required' });
      console.log('📄 PDF VIDEO FROM TOPICS:', projectId, topics.length, 'topics');
      const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (!projectResult.rows.length) return res.status(404).json({ success: false, error: 'Project not found' });
      const project = projectResult.rows[0];
      if (!project.pdf_url) return res.status(400).json({ success: false, error: 'No PDF uploaded' });
      console.log('1️⃣ Downloading PDF...');
      const pdfBuffer = await pdfUploadService.getPDF(project.pdf_url);
      console.log('2️⃣ Generating scenes with chapters...');
      const scenes = [];
      let sceneNumber = 1;
      const layoutOptions = ['bullets', 'fulltext', 'stat', 'quote', 'cards', 'half-left', 'half-right', 'third-sidebar'];
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        scenes.push({ scene_number: sceneNumber++, scene_type: 'chapter', layout: 'chapter', title: topic.name, body: null, narration: null, bullets: [], assetKeywords: null, assetUrl: null as string | null, assetType: null as string | null });
        console.log('Scene', sceneNumber - 1, ': Chapter -', topic.name);
        const subtopics = Array.isArray(topic.subtopics) && topic.subtopics.length > 0 ? topic.subtopics : [];
        for (const subtopic of subtopics) {
          const randomLayout = layoutOptions[Math.floor(Math.random() * layoutOptions.length)];
          console.log('Scene', sceneNumber, ':', subtopic, '- Layout:', randomLayout);
          const pdfTopic = { title: subtopic, description: topic.description || '', keywords: [subtopic], pageNumbers: topic.pageNumbers || [] };
          const sceneContent = await claudePDFService.generateSceneFromPDF(pdfTopic, pdfBuffer, '');
          scenes.push({ scene_number: sceneNumber++, scene_type: 'content', layout: randomLayout, title: sceneContent.title, body: sceneContent.body, narration: sceneContent.narration, bullets: sceneContent.bullets, assetKeywords: subtopic, assetUrl: null as string | null, assetType: null as string | null });
        }
      }
      console.log('3️⃣ Fetching images...');
      const usedImageIds = new Set<number>();
      for (const scene of scenes) {
        if (scene.scene_type === 'chapter') continue;
        try {
          const image = await pexelsService.fetchImageAsset(scene.assetKeywords);
          if (image && !usedImageIds.has(image.id)) {
            scene.assetUrl = image.url;
            scene.assetType = 'image';
            usedImageIds.add(image.id);
            console.log('  ✅ Image for:', scene.title);
          }
        } catch (error) {
          console.log('  ⚠️  No image for:', scene.title);
        }
      }
      console.log('4️⃣ Saving scenes...');
      await pool.query('DELETE FROM scenes WHERE project_id = $1', [projectId]);
      for (const scene of scenes) {
        await pool.query('INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, bullets, bg_type, asset_url, asset_type, asset_keywords, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())', [projectId, scene.scene_number, scene.scene_type, scene.layout, scene.title, scene.body, scene.narration, JSON.stringify(scene.bullets), scene.scene_type === 'chapter' ? 'gradient' : 'image', scene.assetUrl, scene.assetType, scene.assetKeywords]);
      }
      await pool.query('UPDATE projects SET status = $1, scene_count = $2, updated_at = NOW() WHERE id = $3', ['completed', scenes.length, projectId]);
      
      // Generate thumbnail
      console.log('5️⃣ Generating project thumbnail...');
      const scenesResult = await pool.query('SELECT * FROM scenes WHERE project_id = $1 ORDER BY scene_number', [projectId]);
      let thumbnailUrl = null;
      const imageScene = scenesResult.rows.find((s: any) => s.asset_type === 'image' && s.asset_url);
      if (imageScene) {
        thumbnailUrl = imageScene.asset_url;
        console.log('✅ Using image from scene:', imageScene.title);
      } else {
        console.log('⚠️ No image scene - generating AI thumbnail...');
        try {
          const projectResult = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);
          const searchQuery = projectResult.rows[0]?.name || 'training';
          console.log('🔍 Generating thumbnail for:', searchQuery);
          const pexelsImage = await pexelsService.fetchImageAsset(searchQuery);
          if (pexelsImage) {
            thumbnailUrl = pexelsImage.url;
            console.log('✅ AI-generated thumbnail from Pexels');
          }
        } catch (error) {
          console.error('❌ Thumbnail generation error:', error);
        }
      }
      if (thumbnailUrl) {
        await pool.query('UPDATE projects SET thumbnail_url = $1 WHERE id = $2', [thumbnailUrl, projectId]);
        console.log('✅ Thumbnail saved:', thumbnailUrl.substring(0, 60) + '...');
      }
      
      console.log('✅ PDF VIDEO COMPLETE!');
      return res.json({ success: true, project: { id: projectId, scenes: scenesResult.rows } });
    } catch (error: any) {
      console.error('❌ ERROR:', error);
      return res.status(500).json({ success: false, error: 'Failed', message: error.message });
    }
  }

  async generateVideoFromPDF(req: Request, res: Response) {
    try {
      const { projectId, sceneCount = 10, context } = req.body;
      const userId = (req as any).user?.userId || 'default-user';
      const tenantId = (req as any).user?.tenantId || 'default-tenant';
      if (!req.file) return res.status(400).json({ success: false, error: 'No PDF file provided' });
      const upload = await pdfUploadService.uploadPDF(req.file.buffer, tenantId, userId);
      await pool.query('UPDATE projects SET pdf_url = $1, pdf_filename = $2, pdf_pages = $3, pdf_size_mb = $4, content_source_type = $5, updated_at = NOW() WHERE id = $6', [upload.gcsPath, req.file.originalname, upload.pages, upload.size / 1024 / 1024, 'pdf', projectId]);
      const topics = await claudePDFService.extractTopicsFromPDF(req.file.buffer, parseInt(sceneCount), context);
      const scenes = [];
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const sceneContent = await claudePDFService.generateSceneFromPDF(topic, req.file.buffer, context);
        scenes.push({ scene_number: i + 1, scene_type: 'content', layout: sceneContent.layout, title: sceneContent.title, body: sceneContent.body, narration: sceneContent.narration, bullets: sceneContent.bullets });
      }
      for (const scene of scenes) {
        await pool.query('INSERT INTO scenes (project_id, scene_number, scene_type, layout, title, body, narration, bullets, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())', [projectId, scene.scene_number, scene.scene_type, scene.layout, scene.title, scene.body, scene.narration, JSON.stringify(scene.bullets)]);
      }
      await pool.query('UPDATE projects SET status = $1, scene_count = $2, updated_at = NOW() WHERE id = $3', ['completed', scenes.length, projectId]);
      return res.json({ success: true, project: { id: projectId }, scenes: scenes, message: 'Generated ' + scenes.length + ' scenes from PDF' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to generate video from PDF', message: error.message });
    }
  }
}

export default new PDFController();
