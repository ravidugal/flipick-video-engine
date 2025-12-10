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
  async generateTopics(subject: string, trainingType: string = 'compliance', sceneCount: number = 15): Promise<Topic[]> {
    try {
      // Calculate optimal topic/subtopic distribution based on scene count
      // Reserve 1 scene for intro, rest are content scenes
      const contentScenes = Math.max(sceneCount - 1, 5);
      
      // Determine number of topics (typically 4-5 subtopics per topic)
      let topicCount: number;
      let subtopicsPerTopic: number;
      
      if (contentScenes <= 10) {
        // Small courses: 2-3 topics with 2-4 subtopics each
        topicCount = Math.ceil(contentScenes / 3);
        subtopicsPerTopic = Math.ceil(contentScenes / topicCount);
      } else if (contentScenes <= 20) {
        // Medium courses: 3-4 topics with 3-5 subtopics each
        topicCount = Math.ceil(contentScenes / 4);
        subtopicsPerTopic = Math.ceil(contentScenes / topicCount);
      } else {
        // Large courses: 5-6 topics with 4-5 subtopics each
        topicCount = Math.ceil(contentScenes / 5);
        subtopicsPerTopic = Math.ceil(contentScenes / topicCount);
      }

      const prompt = `Create a training course outline for: ${subject}
Training type: ${trainingType}

CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
CRITICAL: Generate EXACTLY ${topicCount} main topics, each with APPROXIMATELY ${subtopicsPerTopic} subtopics.
MATH VERIFICATION: ${topicCount} topics × (1 chapter + ${subtopicsPerTopic} content) = ${topicCount} × ${subtopicsPerTopic + 1} = ${topicCount * (subtopicsPerTopic + 1)} scenes (target: ${contentScenes})

CONCRETE EXAMPLE - If user requests 15 scenes:
  - Generate 3 topics (NOT 15 topics!)
  - Each topic has 1 chapter scene + 4 subtopic scenes = 5 scenes per topic
  - Total: 3 topics × 5 scenes = 15 scenes ✓

FOR YOUR TASK (${contentScenes} scenes total):
  - Generate ${topicCount} topics
  - Each topic needs ${subtopicsPerTopic} subtopics
  - Verification: ${topicCount} topics × ${subtopicsPerTopic + 1} scenes each ≈ ${contentScenes} total

Return ONLY valid JSON:
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2"]}]}
NO markdown, NO code blocks, ONLY JSON.
{"topics":[{"name":"Topic Name","subtopics":["Subtopic 1","Subtopic 2","Subtopic 3"]}]}

NO markdown, NO code blocks, NO explanatory text - ONLY the JSON object.`;

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
  let totalItems = parsed.topics.reduce((sum: number, t: Topic) => 
    sum + 1 + (t.subtopics?.length || 0), 0);
  
  // Truncate if exceeds target
  if (totalItems > contentScenes) {
    console.log(`⚠️ Generated ${totalItems} scenes, truncating to ${contentScenes}`);
    let remaining = contentScenes;
    const truncatedTopics: Topic[] = [];
    
    for (const topic of parsed.topics) {
      if (remaining <= 0) break;
      
      // Always include the topic itself
      if (remaining === 1) {
        truncatedTopics.push({ name: topic.name, subtopics: [] });
        remaining = 0;
      } else {
        const subtopicsToTake = Math.min(topic.subtopics?.length || 0, remaining - 1);
        truncatedTopics.push({
          name: topic.name,
          subtopics: topic.subtopics?.slice(0, subtopicsToTake) || []
        });
        remaining -= (1 + subtopicsToTake);
      }
    }
    
    totalItems = truncatedTopics.reduce((sum: number, t: Topic) => 
      sum + 1 + (t.subtopics?.length || 0), 0);
    console.log(`✅ Truncated to ${truncatedTopics.length} topics with ${totalItems} total scenes`);
    return truncatedTopics;
  }
  
  console.log(`✅ Generated ${parsed.topics.length} topics with ${totalItems} total scenes (target: ${contentScenes})`);
  return parsed.topics;
}
      }

      // Fallback
      return this.generateFallbackTopics(subject, sceneCount || 15);
    } catch (error: any) {
      console.error('❌ Claude topics error:', error.message);
      return this.generateFallbackTopics(subject, sceneCount || 15);
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
          timeout: 60000
        }
      );

      const text = response.data.content[0].text;
      const match = text.match(/\{[\s\S]*\}/);
      
      if (match) {
        const parsed = JSON.parse(match[0]);
        console.log(`✅ Generated ${layout} content for: ${subtopic}`);
        return parsed;
      }

      console.log(`⚠️ No valid JSON in response for: ${subtopic}`);
      return null;

    } catch (error: any) {
      console.error(`❌ Claude scene error (${subtopic}):`, error.message);
      return null;
    }
  }

  /**
   * Generic content generation method for Claude API
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
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

      return response.data.content[0].text;
      } catch (error: any) {
      console.error('❌ Claude API error:', error.message);
      if (error.code === 'ECONNABORTED') {
        console.error('⏱️ Request timeout after 30 seconds');
      }
      throw new Error('Failed to generate content with Claude');
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
Generate 3 bullet points.
Return JSON: {"body": "intro sentence", "bullets": ["point 1", "point 2", "point 3"], "narration": "voice-over script", "bgType": "video"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'stat':
        return `${basePrompt}
Generate impressive statistic.
Return JSON: {"statValue": "87%", "statLabel": "descriptive label", "narration": "script", "bgType": "gradient"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'quote':
        return `${basePrompt}
Generate inspiring quote.
Return JSON: {"quote": "quote text", "quoteAuthor": "Expert Name", "narration": "script", "bgType": "gradient"}
IMPORTANT: Return ONLY valid JSON, no markdown, no other text.`;

      case 'fulltext':
        return `${basePrompt}
Write paragraph (3-4 sentences).
Return JSON: {"body": "paragraph", "narration": "script", "bgType": "video"}
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
  private generateFallbackTopics(subject: string, sceneCount: number = 15): Topic[] {
    const contentScenes = Math.max(sceneCount - 1, 5);
    const topicCount = Math.max(Math.ceil(contentScenes / 4), 2);
    const subtopicsPerTopic = Math.floor((contentScenes - topicCount) / topicCount);

    const fallbackTopics: Topic[] = [
      { 
        name: `Understanding ${subject}`, 
        subtopics: Array.from({length: subtopicsPerTopic}, (_, i) => 
          ['Key Concepts', 'Why It Matters', 'Core Principles', 'Foundation', 'Overview'][i] || `Concept ${i+1}`
        )
      },
      { 
        name: 'Best Practices', 
        subtopics: Array.from({length: subtopicsPerTopic}, (_, i) => 
          ['Guidelines', 'Common Mistakes', 'Expert Tips', 'Do\'s and Don\'ts'][i] || `Practice ${i+1}`
        )
      },
      { 
        name: 'Implementation', 
        subtopics: Array.from({length: subtopicsPerTopic}, (_, i) => 
          ['Getting Started', 'Daily Application', 'Measuring Success', 'Action Steps'][i] || `Step ${i+1}`
        )
      },
      { 
        name: 'Advanced Topics', 
        subtopics: Array.from({length: subtopicsPerTopic}, (_, i) => 
          ['Complex Scenarios', 'Case Studies', 'Future Trends', 'Expert Level'][i] || `Advanced ${i+1}`
        )
      }
    ];

    return fallbackTopics.slice(0, topicCount);
  }
}

export default new ClaudeService();