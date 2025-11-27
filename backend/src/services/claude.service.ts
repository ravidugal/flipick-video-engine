import axios from 'axios';
import { config } from '../config/env';

interface Topic {
  name: string;
  subtopics: string[];
}

interface SceneContent {
  layout: string;
  title: string;
  body?: string;
  bullets?: string[];
  statValue?: string;
  statLabel?: string;
  quote?: string;
  quoteAuthor?: string;
  cards?: Array<{ icon: string; title: string; desc: string }>;
  timelineItems?: Array<{ year: string; event: string }>;
  iconItems?: Array<{ icon: string; title: string; desc: string }>;
  bgType: 'video' | 'image' | 'gradient';
  narration?: string;
}

export class ClaudeService {
  private apiKey = config.apiKeys.anthropic;
  private apiUrl = 'https://api.anthropic.com/v1/messages';

  /**
   * Generate topics for a course
   */
  async generateTopics(subject: string, trainingType: string = 'compliance'): Promise<Topic[]> {
    try {
      const prompt = `Create a training course outline for: ${subject}
Training type: ${trainingType}

Return 4-6 main topics with 2-4 subtopics each.
Return ONLY valid JSON: {"topics":[{"name":"Topic","subtopics":["Sub1","Sub2"]}]}`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 60000
        }
      );

      const text = response.data.content[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.topics && parsed.topics.length) {
          console.log('✅ Generated', parsed.topics.length, 'topics');
          return parsed.topics;
        }
      }

      // Fallback
      return this.generateFallbackTopics(subject);
    } catch (error: any) {
      console.error('❌ Claude topics error:', error.message);
      return this.generateFallbackTopics(subject);
    }
  }

  /**
   * Generate scene content with Claude AI
   */
  async generateSceneContent(
    layout: string,
    topic: string,
    subtopic: string,
    courseName: string
  ): Promise<SceneContent | null> {
    try {
      const prompt = this.buildPromptForLayout(layout, topic, subtopic, courseName);
      
      console.log(`🤖 Generating AI content: "${subtopic}" (${layout})`);

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000
        }
      );

      let text = response.data.content[0].text;
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const content = JSON.parse(jsonMatch[0]);
        console.log(`✅ AI content generated: "${subtopic}"`);
        return content;
      }

      console.log('⚠️ Could not parse Claude response');
      return null;
    } catch (error: any) {
      console.error('❌ Claude content error:', error.message);
      return null;
    }
  }

  /**
   * Build prompt for specific layout
   */
  private buildPromptForLayout(
    layout: string,
    topic: string,
    subtopic: string,
    courseName: string
  ): string {
    const basePrompt = `Generate content for a training scene about "${subtopic}" in the topic "${topic}" for ${courseName}.`;
    
    switch (layout) {
      case 'bullets':
        return `${basePrompt}
Generate 3 specific, actionable bullet points.
Return JSON: {"body": "intro text", "bullets": ["point1", "point2", "point3"], "narration": "script", "bgType": "video"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'stat':
        return `${basePrompt}
Generate a realistic, relevant statistic.
Return JSON: {"statValue": "87%", "statLabel": "description", "narration": "script", "bgType": "gradient"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'quote':
        return `${basePrompt}
Generate an impactful quote.
Return JSON: {"quote": "quote text", "quoteAuthor": "Author Name", "narration": "script", "bgType": "gradient"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'cards2':
        return `${basePrompt}
Generate do/don't comparison.
Return JSON: {"cards": [{"icon":"✅","title":"Do","desc":"..."},{"icon":"❌","title":"Don't","desc":"..."}], "narration": "script", "bgType": "video"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'cards4':
        return `${basePrompt}
Generate 4 actionable steps.
Return JSON: {"cards": [{"icon":"🎯","title":"Step","desc":"..."}], "narration": "script", "bgType": "image"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'timeline':
        return `${basePrompt}
Generate 4-step progression.
Return JSON: {"timelineItems": [{"year":"Step 1","event":"..."}], "narration": "script", "bgType": "video"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'iconlist':
        return `${basePrompt}
Generate 4 key insights.
Return JSON: {"iconItems": [{"icon":"💡","title":"...","desc":"..."}], "narration": "script", "bgType": "image"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'split':
        return `${basePrompt}
Write descriptive content.
Return JSON: {"body": "paragraph", "splitImage": "image description", "narration": "script", "bgType": "image"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      default:
        return `${basePrompt}
Write comprehensive paragraph.
Return JSON: {"body": "detailed paragraph", "narration": "script", "bgType": "video"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;
    }
  }

  /**
   * Fallback topics if Claude fails
   */
  private generateFallbackTopics(subject: string): Topic[] {
    return [
      { name: `Understanding ${subject}`, subtopics: ['Key Concepts', 'Why It Matters', 'Core Principles'] },
      { name: 'Best Practices', subtopics: ['Guidelines', 'Common Mistakes', 'Expert Tips'] },
      { name: 'Implementation', subtopics: ['Getting Started', 'Daily Application', 'Measuring Success'] },
      { name: 'Advanced Topics', subtopics: ['Complex Scenarios', 'Case Studies', 'Future Trends'] }
    ];
  }
}

export default new ClaudeService();
