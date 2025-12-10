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
    console.log(`🤖 Extracting ${sceneCount} topics from PDF...`);

    const pdfBase64 = pdfBuffer.toString('base64');

    const systemPrompt = `You are a precise content extractor for educational video creation.

CRITICAL RULES:
1. Use ONLY information from the provided PDF document
2. Do NOT add external knowledge or assumptions
3. Extract topics that will make compelling video scenes
4. Cite page numbers for all facts`;

    let userPrompt = `Extract exactly ${sceneCount} main topics from this PDF document for video creation.

For each topic, provide:
1. Topic title (concise, 5-8 words)
2. Description (2-3 sentences using ONLY content from the PDF)
3. Key keywords (3-5 words for visual search)
4. Page number(s) where discussed

Format as JSON array:
[
  {
    "title": "Topic title",
    "description": "Description from PDF",
    "keywords": ["keyword1", "keyword2", "keyword3"],
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

      console.log(`✅ Extracted ${topics.length} topics from PDF`);
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
3. Content should be suitable for voice-over narration`;

    let userPrompt = `Create content for a video scene about: "${topic.title}"

Reference pages: ${topic.pageNumbers.join(', ')}
Context: ${topic.description}

Generate:
1. Scene title
2. Body text (2-3 paragraphs, using ONLY PDF content)
3. Narration script (natural spoken form)
4. 3-5 bullet points (key takeaways)
5. Layout: choose from: 'fulltext', 'bullets', 'cards', 'stat', 'quote'
6. Keywords for visual search (3-5 words)

Format as JSON:
{
  "title": "Scene title",
  "body": "Body paragraphs",
  "narration": "Natural spoken script",
  "bullets": ["Point 1", "Point 2", "Point 3"],
  "layout": "bullets",
  "keywords": ["keyword1", "keyword2"]
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
