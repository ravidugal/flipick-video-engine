import { Request, Response } from 'express';
import { pool } from '../config/database';
import claudeService from '../services/claude.service';
import pexelsService from '../services/pexels.service';

interface Topic {
  name: string;
  subtopics: string[];
}

export class AIController {
  /**
   * Generate course topics
   */
  async generateTopics(req: Request, res: Response) {
    try {
      const { subject, trainingType, sceneCount } = req.body;

      if (!subject) {
        return res.status(400).json({ error: 'Subject is required' });
      }

      console.log(`🎓 Generating topics for: ${subject}`);

      const topics = await claudeService.generateTopics(subject, trainingType, sceneCount || 15);

      res.json({
        success: true,
        topics,
        count: topics.length
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
   * Generate complete video with scenes
   */
  async generateVideo(req: Request, res: Response) {
    try {
      const { projectId, subject, courseName, trainingType, topics, sceneCount } = req.body;

      if (!topics || !Array.isArray(topics)) {
        return res.status(400).json({ error: 'Topics array is required' });
      }

      console.log(`🎬 Generating video: ${courseName || subject}`);

      // Reset asset tracking for this generation
      console.log('🔄 Reset asset tracking');
      const usedVideoAssets = new Set<number>();
      const usedImageAssets = new Set<number>();

      // Calculate scenes per topic
      const targetScenes = Math.min(sceneCount || 15, 50);
      const contentScenes = Math.max(targetScenes - topics.length - 2, topics.length);
      const scenesPerTopic = Math.floor(contentScenes / topics.length);

      // Generate scenes
      const finalScenes: any[] = [];

      // Intro scene
      finalScenes.push({
        type: 'intro',
        title: courseName || subject,
        layout: 'intro',
        bgType: 'video',
        assetKeywords: trainingType || 'business professional training'
      });

      // Generate content scenes for each topic
      for (const topic of topics) {
        // Chapter marker
        finalScenes.push({
          type: 'chapter',
          title: topic.name,
          layout: 'chapter',
          bgType: 'gradient'
        });

        // Generate scenes for subtopics
        const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];
        const scenesToGenerate = Math.min(subtopics.length, scenesPerTopic);

        for (let i = 0; i < scenesToGenerate; i++) {
          const subtopic = typeof subtopics[i] === 'string' 
            ? subtopics[i] 
            : (subtopics[i] as any).name || 'Key Concept';

          // Choose layout with weighted selection
          // 40% partial-image layouts, 60% full-background layouts
          const partialImageLayouts = ['half-left', 'half-right', 'third-sidebar'];
          const fullBackgroundLayouts = ['bullets', 'fulltext', 'stat', 'quote', 'cards2', 'cards4', 'timeline', 'iconlist', 'split'];
          
          let layout: string;
          if (Math.random() < 0.4) {
            // 40% chance: use partial-image layout
            layout = partialImageLayouts[Math.floor(Math.random() * partialImageLayouts.length)];
          } else {
            // 60% chance: use full-background layout
            layout = fullBackgroundLayouts[Math.floor(Math.random() * fullBackgroundLayouts.length)];
          }

          // Generate content with Claude AI
          let sceneContent = await claudeService.generateSceneContent(
            layout,
            topic.name,
            subtopic,
            courseName || subject
          );

          // Fallback if Claude fails
          if (!sceneContent) {
            sceneContent = this.generateFallbackContent(layout, subtopic);
          }

          // Ensure partial-image layouts always have image/video background
          if (['half-left', 'half-right', 'third-sidebar'].includes(layout)) {
            if (sceneContent) sceneContent.bgType = 'image';
          }

          finalScenes.push({
            type: 'content',
            layout: layout,
            title: subtopic,
            eyebrow: topic.name,
            ...sceneContent,
            assetKeywords: `${subtopic} ${topic.name} ${trainingType || 'business'}`
          });
        }
      }

      console.log(`🎨 Generating ${finalScenes.length} scenes...`);

      // Fetch assets for scenes
      for (const scene of finalScenes) {
        if (scene.bgType === 'video') {
          // Get video asset
          const video = await pexelsService.fetchVideoAsset(scene.assetKeywords || scene.title);
          if (video && !usedVideoAssets.has(video.id)) {
            scene.assetUrl = video.url;
            scene.assetType = 'video';
            scene.assetId = video.id;
            usedVideoAssets.add(video.id);
          }
        } else if (scene.bgType === 'image') {
          // Get image asset
          const image = await pexelsService.fetchImageAsset(scene.assetKeywords || scene.title);
          if (image && !usedImageAssets.has(image.id)) {
            scene.assetUrl = image.url;
            scene.assetType = 'image';
            scene.assetId = image.id;
            usedImageAssets.add(image.id);
          }
        } else if (scene.bgType === 'gradient') {
          // Gradient scenes don't need assets
          scene.gradient = this.getRandomGradient();
        }
      }

      console.log(`✅ Generated ${finalScenes.length} scenes with assets`);

      // Save to database
      console.log('💾 Saving to database...');

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Delete existing scenes if regenerating
        if (projectId) {
          await client.query(
            'DELETE FROM scenes WHERE project_id = $1',
            [projectId]
          );
          console.log('🗑️ Cleared existing scenes for regeneration');
        }

        let project;
        
        if (projectId) {
          // Use existing project
          const projectResult = await client.query(
            'SELECT * FROM projects WHERE id = $1',
            [projectId]
          );
          project = projectResult.rows[0];
          
          if (!project) {
            throw new Error('Project not found');
          }
          
          console.log(`✅ Using existing project: ${project.id}`);
        } else {
          // Create new project (backward compatibility)
          const projectResult = await client.query(
            `INSERT INTO projects (name, prompt, course_name, training_type, scene_count, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [courseName || subject, subject, courseName || subject, trainingType || 'compliance', finalScenes.length, 'completed']
          );
          project = projectResult.rows[0];
          console.log(`✅ Created new project: ${project.id}`);
        }

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
              scene.eyebrow || null,
              scene.title || 'Untitled',
              scene.subtitle || null,
              scene.body || null,
              scene.narration || null,
              scene.bullets ? JSON.stringify(scene.bullets) : null,
              scene.cards ? JSON.stringify(scene.cards) : null,
              scene.timelineItems ? JSON.stringify(scene.timelineItems) : null,
              scene.iconItems ? JSON.stringify(scene.iconItems) : null,
              scene.statValue || null,
              scene.statLabel || null,
              scene.quote || null,
              scene.quoteAuthor || null,
              scene.bgType || 'gradient',
              scene.gradient || null,
              scene.assetUrl || null,
              scene.assetType || null,
              scene.assetId || null,
              scene.assetKeywords || null
            ]
          );
        }

        // Generate MCQ questions if enabled
        if (project.include_quiz && project.quiz_count > 0) {
          console.log(`📝 Generating ${project.quiz_count} MCQ questions...`);
          
          // Gather all scene content for context
          const contentSummary = finalScenes
            .filter(s => s.type === 'content')
            .map(s => `${s.title}: ${s.body || s.bullets?.join(', ') || ''}`)
            .join('\n');
          
          try {
            await this._generateMCQsInternal(
              project.id,
              contentSummary,
              project.quiz_count,
              project.name,
              client  // Pass transaction client
            );
            
            console.log(`✅ MCQ questions generated successfully`);
          } catch (error: any) {
            console.error(`❌ MCQ generation failed:`, error.message);
            // Don't fail the whole request if MCQ generation fails
          }
        }

        console.log(`💾 Saved project: ${project.id} with ${finalScenes.length} scenes`);

        // ============================================================
// GENERATE PROJECT THUMBNAIL (with AI fallback)
// ============================================================
console.log('🖼️ Generating project thumbnail...');

let thumbnailUrl = null;

// STEP 1: Try to find image scene
const imageScene = finalScenes.find(scene => 
  scene.assetType === 'image' && scene.assetUrl
);

if (imageScene) {
  thumbnailUrl = imageScene.assetUrl;
  console.log(`✅ Using image from scene: "${imageScene.title}"`);
} else {
  // STEP 2: No images? Generate from Pexels
  console.log('⚠️ No image scene - generating AI thumbnail...');
  
  try {
    const searchQuery = courseName || project.name || trainingType || 'business training';
    console.log(`🔍 Generating thumbnail for: "${searchQuery}"`);
    
    const pexelsImage = await pexelsService.fetchImageAsset(searchQuery);
    
    if (pexelsImage && pexelsImage.url) {
      thumbnailUrl = pexelsImage.url;
      console.log(`✅ AI-generated thumbnail from Pexels`);
    } else {
      // STEP 3: Last resort - use video scene
      const videoScene = finalScenes.find(s => s.assetType === 'video' && s.assetUrl);
      if (videoScene) {
        thumbnailUrl = videoScene.assetUrl;
        console.log(`✅ Using video thumbnail as fallback`);
      }
    }
  } catch (error) {
    console.error('❌ Thumbnail generation error:', error);
  }
}

// Save thumbnail
if (thumbnailUrl) {
  try {
    await client.query(
      'UPDATE projects SET thumbnail_url = $1 WHERE id = $2',
      [thumbnailUrl, project.id]
    );
    console.log(`✅ Thumbnail saved: ${thumbnailUrl.substring(0, 60)}...`);
  } catch (error) {
    console.error('❌ Failed to save thumbnail:', error);
  }
} else {
  console.log('⚠️ No thumbnail available');
}
// ============================================================

        await client.query('COMMIT');

        // Fetch complete project with scenes
        const scenesResult = await pool.query(
          'SELECT * FROM scenes WHERE project_id = $1 ORDER BY scene_number',
          [project.id]
        );

        res.json({
          success: true,
          message: 'Video generated successfully',
          project: {
            ...project,
            scenes: scenesResult.rows
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
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
   * Generate fallback content when AI fails
   */
  private generateFallbackContent(layout: string, subtopic: string): any {
    const content: any = {
      title: subtopic,
      narration: `Learn about ${subtopic}.`,
      bgType: 'gradient'
    };

    switch (layout) {
      case 'bullets':
        content.body = `Key points about ${subtopic}:`;
        content.bullets = [
          'Essential concept to understand',
          'Practical application in daily work',
          'Best practices to follow'
        ];
        content.bgType = 'video';
        break;
      case 'stat':
        content.statValue = '85%';
        content.statLabel = `Success rate with proper ${subtopic}`;
        content.bgType = 'gradient';
        break;
      case 'quote':
        content.quote = 'Excellence is not a skill. It is an attitude.';
        content.quoteAuthor = 'Ralph Marston';
        content.bgType = 'gradient';
        break;
      case 'cards2':
        content.cards = [
          { icon: '✅', title: 'Do', desc: 'Follow best practices' },
          { icon: '❌', title: "Don't", desc: 'Avoid common mistakes' }
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
      case 'half-left':
      case 'half-right':
        content.body = `Understanding ${subtopic} is crucial for success in your role.`;
        content.bullets = [
          'Key principle to master',
          'Apply in daily situations',
          'Continuous improvement'
        ];
        content.bgType = 'image';
        break;
      case 'third-sidebar':
        content.body = `${subtopic} forms the foundation of effective practice.`;
        content.bullets = [
          'Understand the basics',
          'Practice consistently',
          'Measure your progress'
        ];
        content.bgType = 'image';
        break;
      default:
        content.body = 'Essential knowledge for professional success.';
        content.bgType = 'video';
    }

    return content;
  }

  /**
   * Get a random gradient for background
   */
  private getRandomGradient(): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  }

  /**
   * Internal method to generate MCQ questions (no req/res dependencies)
   */
  private async _generateMCQsInternal(
    projectId: string,
    content: string,
    quizCount: number,
    courseName: string,
    client?: any
  ) {
    console.log(`📝 Generating ${quizCount} MCQ questions for project ${projectId}`);
    
    // Create prompt for Claude to generate MCQs
    const prompt = `You are an expert instructional designer creating assessment questions for a corporate training video.

Video Title: "${courseName || 'Training Video'}"
Video Content Summary:
${content}

Generate exactly ${quizCount} multiple-choice questions to test learner understanding of this content.

REQUIREMENTS:
1. Questions should test key concepts, not trivial details
2. Each question must have exactly 4 options (A, B, C, D)
3. Only ONE option should be correct
4. Provide clear explanations for why the correct answer is right
5. Vary difficulty: ${quizCount <= 5 ? 'medium' : 'mix of easy, medium, and hard'}
6. Questions should be practical and scenario-based when possible

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "questions": [
    {
      "question": "What is the primary purpose of...",
      "options": [
        {"id": "A", "text": "First option text", "is_correct": false},
        {"id": "B", "text": "Second option text", "is_correct": true},
        {"id": "C", "text": "Third option text", "is_correct": false},
        {"id": "D", "text": "Fourth option text", "is_correct": false}
      ],
      "explanation": "The correct answer is B because...",
      "difficulty": "medium"
    }
  ]
}`;

    // Call Claude API
    const mcqData = await claudeService.generateContent(prompt);
    
    // Parse response
    let parsedData;
    try {
      const cleanedText = mcqData
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Failed to parse MCQ response:', mcqData);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate response structure
    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error('Invalid MCQ response structure');
    }

    // Use transaction client if provided, otherwise use pool
    const db = client || pool;

    // Insert MCQ scenes into database
    const insertedScenes = [];
    
    // ADD QUIZ TRANSITION SCENE FIRST (scene 999)
console.log('📝 Inserting quiz transition scene...');
const transitionResult = await db.query(
  `INSERT INTO scenes 
   (project_id, scene_number, scene_type, title, body, layout, bg_type, gradient, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
   RETURNING *`,
  [
    projectId,
    999,
    'quiz_transition',
    'Ready to Test Your Knowledge?',
    `Let's see how much you've learned! This quiz has ${quizCount} questions.`,
    'centered',
    'gradient',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  ]
);
insertedScenes.push(transitionResult.rows[0]);

    for (let i = 0; i < parsedData.questions.length; i++) {
      const question = parsedData.questions[i];
      
      // Validate each question
      if (!question.options || question.options.length !== 4) {
        console.error(`⚠️ Question ${i + 1} doesn't have exactly 4 options, skipping`);
        continue;
      }

      const correctCount = question.options.filter((opt: any) => opt.is_correct).length;
      if (correctCount !== 1) {
        console.error(`⚠️ Question ${i + 1} doesn't have exactly 1 correct answer, skipping`);
        continue;
      }

      // Insert quiz scene
      const result = await db.query(
        `INSERT INTO scenes 
         (project_id, scene_number, scene_type, title, body, quiz_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [
          projectId,
          1000 + i, // Scene numbers 1000+ for quiz questions
          'quiz_mcq',
          `Question ${i + 1} of ${quizCount}`,
          question.question,
          JSON.stringify(question)
        ]
      );

      insertedScenes.push(result.rows[0]);
    }

    console.log(`✅ Successfully generated and inserted ${insertedScenes.length} MCQ questions`);
    
    return {
      success: true,
      scenes: insertedScenes,
      quizCount: insertedScenes.length
    };
  }

  /**
   * HTTP endpoint to generate MCQ questions
   */
  async generateMCQs(req: Request, res: Response) {
    try {
      const { projectId, content, quizCount, courseName } = req.body;
      
      if (!projectId || !content || !quizCount) {
        return res.status(400).json({
          error: 'projectId, content, and quizCount are required'
        });
      }

      const result = await this._generateMCQsInternal(
        projectId,
        content,
        quizCount,
        courseName
      );

      res.json({
        success: true,
        message: `Generated ${result.quizCount} quiz questions`,
        scenes: result.scenes,
        quizCount: result.quizCount
      });

    } catch (error: any) {
      console.error('❌ Generate MCQs error:', error);
      res.status(500).json({
        error: 'Failed to generate MCQ questions',
        message: error.message
      });
    }
  }
}

export default new AIController();