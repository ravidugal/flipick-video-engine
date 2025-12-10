import { Request, Response } from 'express';
import pdfUploadService from '../services/pdf-upload.service';
import claudePDFService from '../services/claude-pdf.service';
import { pool } from '../config/database';

export class PDFController {
  
  async generateVideoFromPDF(req: Request, res: Response) {
    try {
      const { projectId, sceneCount = 10, context } = req.body;
      const userId = (req as any).user?.userId || 'default-user';
      const tenantId = (req as any).user?.tenantId || 'default-tenant';

      console.log('====================================');
      console.log('📄 PDF VIDEO GENERATION REQUEST');
      console.log('====================================');
      console.log('Project ID:', projectId);
      console.log('Scene Count:', sceneCount);

      if (!req.file) {
        console.error('❌ No PDF file provided');
        return res.status(400).json({ 
          success: false,
          error: 'No PDF file provided' 
        });
      }

      console.log('📎 PDF File:', req.file.originalname, `(${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

      console.log('\n1️⃣ Uploading PDF to GCS...');
      const upload = await pdfUploadService.uploadPDF(
        req.file.buffer,
        tenantId,
        userId
      );
      console.log('✅ PDF uploaded:', upload.gcsPath);

      console.log('\n2️⃣ Updating project...');
      await pool.query(`
        UPDATE projects 
        SET pdf_url = $1, 
            pdf_filename = $2,
            pdf_pages = $3,
            pdf_size_mb = $4,
            content_source_type = 'pdf',
            updated_at = NOW()
        WHERE id = $5
      `, [
        upload.gcsPath,
        req.file.originalname,
        upload.pages,
        upload.size / 1024 / 1024,
        projectId
      ]);
      console.log('✅ Project updated');

      console.log(`\n3️⃣ Extracting ${sceneCount} topics...`);
      const topics = await claudePDFService.extractTopicsFromPDF(
        req.file.buffer,
        parseInt(sceneCount),
        context
      );
      console.log(`✅ Extracted ${topics.length} topics`);

      console.log(`\n4️⃣ Generating ${topics.length} scenes...`);
      const scenes = [];

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        console.log(`\n--- Scene ${i + 1}/${topics.length}: ${topic.title} ---`);

        try {
          const sceneContent = await claudePDFService.generateSceneFromPDF(
            topic,
            req.file.buffer,
            context
          );

          const scene = {
            scene_number: i + 1,
            scene_type: 'content',
            layout: sceneContent.layout,
            title: sceneContent.title,
            body: sceneContent.body,
            narration: sceneContent.narration,
            bullets: sceneContent.bullets
          };

          scenes.push(scene);
          console.log(`  ✅ Scene ${i + 1} complete`);

        } catch (error) {
          console.error(`  ❌ Error generating scene ${i + 1}:`, error);
        }
      }

      console.log(`\n✅ Generated ${scenes.length} scenes`);

      console.log('\n5️⃣ Saving scenes...');
      for (const scene of scenes) {
        await pool.query(`
          INSERT INTO scenes (
            project_id, scene_number, scene_type, layout,
            title, body, narration, bullets,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          projectId,
          scene.scene_number,
          scene.scene_type,
          scene.layout,
          scene.title,
          scene.body,
          scene.narration,
          JSON.stringify(scene.bullets)
        ]);
      }
      console.log('✅ Scenes saved');

      console.log('\n6️⃣ Updating project status...');
      await pool.query(`
        UPDATE projects 
        SET status = 'completed', 
            scene_count = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [scenes.length, projectId]);

      console.log('\n====================================');
      console.log('✅ PDF VIDEO GENERATION COMPLETE!');
      console.log('====================================');

      return res.json({
        success: true,
        project: { id: projectId },
        scenes: scenes,
        message: `Generated ${scenes.length} scenes from PDF`
      });

    } catch (error: any) {
      console.error('\n❌ PDF VIDEO GENERATION ERROR:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate video from PDF',
        message: error.message
      });
    }
  }
}

export default new PDFController();
