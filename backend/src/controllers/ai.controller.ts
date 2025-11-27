import { Request, Response } from 'express';
import claudeService from '../services/claude.service';
import pexelsService from '../services/pexels.service';
import pool from '../config/database';

const GRADIENTS = [
  'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
  'linear-gradient(135deg, #14532d 0%, #166534 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
  'linear-gradient(135deg, #44403c 0%, #57534e 100%)'
];

const LAYOUTS = ['bullets', 'stat', 'cards2', 'fulltext', 'quote', 'timeline', 'iconlist', 'cards4', 'split', 'bullets'];

export class AIController {
  /**
   * Generate topics for a course
   */
  async generateTopics(req: Request, res: Response) {
    try {
      const { subject, trainingType } = req.body;

      if (!subject) {
        return res.status(400).json({ error: 'Subject is required' });
      }

      console.log(`🎓 Generating topics for: ${subject}`);

      const topics = await claudeService.generateTopics(subject, trainingType || 'compliance');

      res.json({
        success: true,
        topics,
        source: 'claude'
      });
    } catch (error: any) {
      console.error('❌ Generate topics error:', error);
      res.status(500).json({
        error: 'Failed to generate topics',
        message: error.message
      });
    }
  }

  /**
   * Generate complete video with scenes and assets
   */
  async generateVideo(req: Request, res: Response) {
    try {
      const { subject, courseName, trainingType, topics, sceneCount } = req.body;

      if (!subject || !topics) {
        return res.status(400).json({ error: 'Subject and topics are required' });
      }

      console.log(`🎬 Generating video: ${courseName || subject}`);

      // Reset asset tracking
      pexelsService.resetUsedAssets();

      // Build scene list
      const sceneList: any[] = [];
      
      // Intro scene
      sceneList.push({ 
        type: 'intro', 
        topic: courseName || subject 
      });

      // Content scenes
      topics.forEach((topic: any, ti: number) => {
        // Chapter divider
        sceneList.push({ 
          type: 'chapter', 
          topic: topic.name, 
          chapterNum: ti + 1 
        });

        // Subtopic scenes
        (topic.subtopics || []).forEach((sub: string, si: number) => {
          sceneList.push({
            type: 'content',
            topic: topic.name,
            subtopic: sub,
            chapterNum: ti + 1,
            subNum: si + 1
          });
        });
      });

      // Closing scene
      sceneList.push({ 
        type: 'closing', 
        topic: courseName || subject 
      });

      // Limit scenes
      const limitedScenes = sceneList.slice(0, sceneCount || 15);

      // Generate content for each scene (WITHOUT database connection)
      const finalScenes = [];
      let layoutIndex = 0;
      let gradientIndex = 0;

      console.log(`🎨 Generating ${limitedScenes.length} scenes...`);

      for (let idx = 0; idx < limitedScenes.length; idx++) {
        const s = limitedScenes[idx];
        let scene: any = {};

        if (s.type === 'intro') {
          scene = {
            type: 'intro',
            layout: 'headline',
            bgType: 'video',
            assetKeywords: `${s.topic} corporate professional team success modern office`,
            title: s.topic,
            subtitle: `${topics.length} Chapters • Professional Training`,
            body: 'Master essential skills through engaging, practical learning.'
          };

          // Fetch video asset
          const asset = await pexelsService.fetchAsset(scene.assetKeywords, 'video');
          if (asset) scene.asset = asset;

        } else if (s.type === 'chapter') {
          scene = {
            type: 'chapter',
            layout: 'headline',
            bgType: 'gradient',
            gradient: GRADIENTS[gradientIndex % GRADIENTS.length],
            eyebrow: `Chapter ${s.chapterNum}`,
            title: s.topic,
            subtitle: 'Key concepts and practical applications'
          };
          gradientIndex++;

        } else if (s.type === 'content') {
          const layout = LAYOUTS[layoutIndex % LAYOUTS.length];
          layoutIndex++;

          console.log(`🤖 Generating scene ${idx + 1}/${limitedScenes.length}: "${s.subtopic}"`);

          // Try to generate with AI
          let sceneContent = await claudeService.generateSceneContent(
            layout,
            s.topic,
            s.subtopic,
            courseName || subject
          );

          // Use fallback if AI fails
          if (!sceneContent) {
            console.log(`⚠️ Using fallback for: ${s.subtopic}`);
            sceneContent = this.generateFallbackContent(layout, s.topic, s.subtopic, idx);
          }

          scene = {
            type: 'content',
            layout,
            eyebrow: `${s.chapterNum}.${s.subNum}`,
            title: s.subtopic,
            assetKeywords: `${s.subtopic} professional workplace business`,
            ...sceneContent
          };

          // Apply gradient if needed
          if (scene.bgType === 'gradient') {
            scene.gradient = GRADIENTS[(gradientIndex + idx) % GRADIENTS.length];
          } else {
            // Fetch asset
            const asset = await pexelsService.fetchAsset(scene.assetKeywords, scene.bgType);
            if (asset) scene.asset = asset;
          }

        } else if (s.type === 'closing') {
          scene = {
            type: 'closing',
            layout: 'headline',
            bgType: 'video',
            assetKeywords: 'success achievement celebration team applause business happy',
            title: 'Training Complete!',
            subtitle: 'Congratulations on Your Achievement',
            body: `You completed all ${topics.length} chapters. Apply what you learned!`
          };

          // Fetch video asset
          const asset = await pexelsService.fetchAsset(scene.assetKeywords, 'video');
          if (asset) scene.asset = asset;
        }

        finalScenes.push(scene);
      }

      console.log(`✅ Generated ${finalScenes.length} scenes with assets`);

      // NOW save to database (quick transaction)
      console.log('💾 Saving to database...');
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        const projectResult = await client.query(
          `INSERT INTO projects (name, prompt, course_name, training_type, scene_count, status)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [courseName || subject, subject, courseName || subject, trainingType || 'compliance', finalScenes.length, 'completed']
        );

        const project = projectResult.rows[0];

        // Insert scenes
        for (let i = 0; i < finalScenes.length; i++) {
          const scene = finalScenes[i];

          await client.query(
            `INSERT INTO scenes (
              project_id, scene_number, scene_type, layout,
              eyebrow, title, subtitle, body, narration,
              bullets, cards, timeline_items, icon_items,
              stat_value, stat_label, quote, quote_author,
              bg_type, gradient, asset_url, asset_type, asset_id, asset_keywords
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
            [
              project.id,
              i + 1,
              scene.type || 'content',
              scene.layout || 'bullets',
              scene.eyebrow,
              scene.title,
              scene.subtitle,
              scene.body,
              scene.narration,
              scene.bullets ? JSON.stringify(scene.bullets) : null,
              scene.cards ? JSON.stringify(scene.cards) : null,
              scene.timelineItems ? JSON.stringify(scene.timelineItems) : null,
              scene.iconItems ? JSON.stringify(scene.iconItems) : null,
              scene.statValue,
              scene.statLabel,
              scene.quote,
              scene.quoteAuthor,
              scene.bgType || 'video',
              scene.gradient,
              scene.asset?.url,
              scene.asset?.type,
              scene.asset?.id,
              scene.assetKeywords
            ]
          );
        }

        await client.query('COMMIT');

        console.log(`💾 Saved project: ${project.id}`);

        res.json({
          success: true,
          project: {
            ...project,
            scenes: finalScenes
          }
        });

      } catch (dbError: any) {
        await client.query('ROLLBACK');
        console.error('❌ Database error:', dbError);
        throw dbError;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error('❌ Generate video error:', error);
      res.status(500).json({
        error: 'Failed to generate video',
        message: error.message
      });
    }
  }

  /**
   * Fallback content generation
   */
  private generateFallbackContent(layout: string, topic: string, subtopic: string, index: number): any {
    const content: any = {
      layout,
      title: subtopic || topic,
      assetKeywords: `${subtopic || topic} professional workplace business`
    };

    switch (layout) {
      case 'bullets':
        content.body = 'Essential points to understand:';
        content.bullets = [
          'First key principle for success',
          'Critical implementation factor',
          'Industry best practice'
        ];
        content.bgType = 'video';
        break;

      case 'stat':
        const stats = [
          { value: '87%', label: 'report improved outcomes' },
          { value: '3.5x', label: 'faster results' },
          { value: '94%', label: 'find this valuable' }
        ];
        const stat = stats[index % stats.length];
        content.statValue = stat.value;
        content.statLabel = stat.label;
        content.bgType = 'gradient';
        break;

      case 'quote':
        content.quote = 'Excellence is a continuous journey of improvement.';
        content.quoteAuthor = 'Industry Expert';
        content.bgType = 'gradient';
        break;

      case 'cards2':
        content.cards = [
          { icon: '✅', title: 'Do This', desc: 'Follow best practices' },
          { icon: '❌', title: 'Avoid This', desc: 'Common mistakes' }
        ];
        content.bgType = 'video';
        break;

      case 'cards4':
        content.cards = [
          { icon: '🎯', title: 'Focus', desc: 'Clear objectives' },
          { icon: '📊', title: 'Measure', desc: 'Track metrics' },
          { icon: '🔄', title: 'Adapt', desc: 'Adjust approach' },
          { icon: '🚀', title: 'Execute', desc: 'Take action' }
        ];
        content.bgType = 'image';
        break;

      default:
        content.body = 'Essential knowledge for professional success.';
        content.bgType = 'video';
    }

    return content;
  }
}

export default new AIController();
