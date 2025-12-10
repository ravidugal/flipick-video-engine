import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';

interface Topic {
  title: string;
  description: string;
  keywords: string[];
  pageNumbers: number[];
}

interface SceneContent {
  title: string;
  body: string;
  narration: string;
  bullets: string[];
  layout: string;
  keywords: string[];
}

export class ClaudePDFService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey
    });
  }

  async extractTopicsFromPDF(
    pdfBuffer: Buffer,
    sceneCount: number,
    additionalContext?: string
  ): Promise<Topic[]> {
    console.log(`🤖 Extracting topics for ${sceneCount} total scenes from PDF...`);

    const pdfBase64 = pdfBuffer.toString('base64');

    // Calculate optimal topic/subtopic distribution (same logic as AI service)
    const contentScenes = Math.max(sceneCount, 5);
    
    let topicCount: number;
    let subtopicsPerTopic: number;
    
    if (contentScenes <= 10) {
      topicCount = Math.ceil(contentScenes / 3);
      subtopicsPerTopic = Math.ceil(contentScenes / topicCount);
    } else if (contentScenes <= 20) {
      topicCount = Math.ceil(contentScenes / 4);
      subtopicsPerTopic = Math.ceil(contentScenes / topicCount);
    } else {
      topicCount = Math.ceil(contentScenes / 5);
      subtopicsPerTopic = Math.ceil(contentScenes / topicCount);
    }

    console.log(`  → Generating ${topicCount} topics with ~${subtopicsPerTopic} subtopics each`);

    const systemPrompt = `You are a precise content extractor for educational video creation.

CRITICAL RULES:
1. Use ONLY information from the provided PDF document
2. Do NOT add external knowledge or assumptions
3. Extract topics that will make compelling video scenes
4. Cite page numbers for all facts`;

    let userPrompt = `Extract exactly ${topicCount} main topics from this PDF document for video creation.

IMPORTANT: Generate ${topicCount} topics (NOT ${sceneCount} topics!), each with approximately ${subtopicsPerTopic} subtopics.
Total scenes calculation: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content scenes) ≈ ${sceneCount} scenes

For each topic, provide:
1. Topic title (concise, 5-8 words)
2. Description (2-3 sentences using ONLY content from the PDF)
3. Key keywords (${subtopicsPerTopic} keywords, one per subtopic)
4. Page number(s) where discussed

Format as JSON array:
[
  {
    "title": "Topic title",
    "description": "Description from PDF",
    "keywords": ["subtopic1", "subtopic2", "subtopic3"],
    "pageNumbers": [5, 6]
  }
]`;

    if (additionalContext) {
      userPrompt += `\n\nAdditional context: ${additionalContext}`;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: userPrompt
            }
          ]
        }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse topics from response');
      }

      const topics = JSON.parse(jsonMatch[0]);

      console.log(`✅ Extracted ${topics.length} topics (target: ${topicCount})`);
      return topics;
    } catch (error) {
      console.error('❌ Error extracting topics from PDF:', error);
      throw error;
    }
  }

  async generateSceneFromPDF(
    topic: Topic,
    pdfBuffer: Buffer,
    additionalContext?: string
  ): Promise<SceneContent> {
    console.log(`📝 Generating scene for: ${topic.title}`);

    const pdfBase64 = pdfBuffer.toString('base64');

    const systemPrompt = `You are creating educational video content from a PDF document.

CRITICAL RULES:
1. Use ONLY information from the provided PDF
2. Create engaging, professional video scene content
3. Keep ALL text VERY concise and brief`;

    let userPrompt = `Create content for a video scene about: "${topic.title}"

Reference pages: ${topic.pageNumbers.join(', ')}

Generate CONCISE content:
1. Title (8 words max)
2. Body text: Write 1-2 SHORT sentences ONLY (max 25 words total)
3. Narration: Natural voice-over script (2-3 sentences)
4. Bullets: Generate 3 brief points ONLY (each under 8 words)
5. Layout: choose from 'fulltext', 'bullets', 'cards', 'stat', 'quote'
6. Keywords: 3-5 words for images

CRITICAL: Keep text VERY short. Body should be 1-2 sentences maximum.

Return JSON:
{
  "title": "Brief title",
  "body": "One or two short sentences",
  "narration": "Natural spoken script",
  "bullets": ["Brief point", "Brief point", "Brief point"],
  "layout": "bullets",
  "keywords": ["word1", "word2"]
}`;

    if (additionalContext) {
      userPrompt += `\n\nAdditional context: ${additionalContext}`;
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: userPrompt
            }
          ]
        }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse scene content');
      }

      const sceneContent = JSON.parse(jsonMatch[0]);

      console.log(`✅ Generated scene: ${sceneContent.title}`);
      return sceneContent;
    } catch (error) {
      console.error('❌ Error generating scene:', error);
      throw error;
    }
  }
}

export default new ClaudePDFService();