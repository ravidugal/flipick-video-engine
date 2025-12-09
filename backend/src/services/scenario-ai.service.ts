import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ScenarioGenerationParams {
  topic: string;
  industry: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  decision_points: number;
}

interface ScenarioChoice {
  id: string;
  text: string;
  quality: 'optimal' | 'suboptimal' | 'poor';
  target_scene_number: number;
  points: number;
  reasoning: string;
}

interface ScenarioScene {
  scene_number: number;
  scene_type: string;
  layout: string;
  title: string;
  body: string;
  narration: string;
  choices?: ScenarioChoice[];
  choice_quality?: string;
  points?: number;
  feedback?: string;
  bg_type: string;
  gradient: string;
}

export async function generateScenarioContent(
  params: ScenarioGenerationParams
): Promise<{ scenes: ScenarioScene[] }> {
  
  const prompt = buildScenarioPrompt(params);
  
  console.log('🤖 Sending prompt to Claude AI...');
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    console.log('✅ Received AI response, parsing JSON...');
    
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const scenarioData = JSON.parse(jsonText);
    
    console.log('✅ Parsed scenario with', scenarioData.scenes.length, 'scenes');
    
    return scenarioData;

  } catch (error: any) {
    console.error('❌ Error generating scenario:', error);
    return generateFallbackScenario(params);
  }
}

function buildScenarioPrompt(params: ScenarioGenerationParams): string {
  const { topic, industry, difficulty, decision_points } = params;
  
  const difficultyGuidance = {
    beginner: 'Clear right and wrong choices. Obvious consequences. Educational tone.',
    intermediate: 'More nuanced choices. Realistic workplace complexity. Some choices have trade-offs.',
    advanced: 'Subtle differences between choices. Complex ethical dilemmas. Multiple valid approaches.'
  };

  return `You are an expert instructional designer creating a scenario-based training experience for corporate employees.

**Training Details:**
- Topic: ${topic}
- Industry: ${industry}
- Difficulty: ${difficulty}
- Decision Points: ${decision_points}

**Difficulty Guidance:**
${difficultyGuidance[difficulty]}

**Task:**
Create a realistic, engaging workplace scenario with ${decision_points} decision points. Each decision should have 3 choices (optimal, suboptimal, poor).

**Structure Required:**

1. **Intro Scene** - Set up the situation (1 scene)
2. **Decision Points** - ${decision_points} scenarios where user must choose (${decision_points} scenes)
3. **Consequence Scenes** - Show outcome for each choice (${decision_points * 3} scenes)
4. **Final Outcome Scenes** - 3 endings based on overall performance (3 scenes)

**Total Scenes:** ${1 + decision_points + (decision_points * 3) + 3}

**Scene Types:**
- "intro" - Introduction to scenario
- "scenario_decision" - Decision point with 3 choices
- "consequence" - Outcome of a choice (optimal/suboptimal/poor)
- "outcome" - Final result scene

**Choice Quality Scoring:**
- Optimal choice: 10 points
- Suboptimal choice: 5 points  
- Poor choice: 0 points

**CRITICAL RULES:**
1. Each decision scene MUST have exactly 3 choices
2. Each choice MUST specify target_scene_number (where it leads)
3. Create consequence scenes that explain why choice was optimal/suboptimal/poor
4. After consequence, flow to next decision or final outcome
5. Use vivid, specific workplace details
6. Make consequences realistic and educational

**JSON Format (RESPOND WITH ONLY THIS JSON, NO OTHER TEXT):**

{
  "scenes": [
    {
      "scene_number": 1,
      "scene_type": "intro",
      "layout": "fulltext",
      "title": "Scenario Title",
      "body": "Situation description...",
      "narration": "What user hears/reads...",
      "bg_type": "gradient",
      "gradient": "linear-gradient(135deg, #1e1b4b, #312e81)"
    },
    {
      "scene_number": 2,
      "scene_type": "scenario_decision",
      "layout": "fulltext",
      "title": "Decision Point 1",
      "body": "Situation requiring decision...",
      "narration": "Narration text...",
      "choices": [
        {
          "id": "choice_1_a",
          "text": "Optimal action description",
          "quality": "optimal",
          "target_scene_number": 3,
          "points": 10,
          "reasoning": "Why this is best"
        },
        {
          "id": "choice_1_b",
          "text": "Suboptimal action description",
          "quality": "suboptimal",
          "target_scene_number": 4,
          "points": 5,
          "reasoning": "Why this is not ideal"
        },
        {
          "id": "choice_1_c",
          "text": "Poor action description",
          "quality": "poor",
          "target_scene_number": 5,
          "points": 0,
          "reasoning": "Why this is wrong"
        }
      ],
      "bg_type": "gradient",
      "gradient": "linear-gradient(135deg, #312e81, #1e3a8a)"
    },
    {
      "scene_number": 3,
      "scene_type": "consequence",
      "layout": "fulltext",
      "title": "Excellent Choice!",
      "body": "Consequence of optimal choice...",
      "narration": "Positive feedback...",
      "choice_quality": "optimal",
      "points": 10,
      "feedback": "Detailed explanation of why this was the best choice and what best practices were followed.",
      "bg_type": "gradient",
      "gradient": "linear-gradient(135deg, #065f46, #047857)"
    }
  ]
}

**IMPORTANT:** 
- Create realistic ${industry} workplace scenarios
- Make consequences feel authentic
- Include specific details (names, situations, policies)
- Feedback should be educational, not preachy
- Vary gradient colors for visual interest

Generate the complete scenario now as valid JSON only.`;
}

function generateFallbackScenario(params: ScenarioGenerationParams): { scenes: ScenarioScene[] } {
  const { topic, decision_points } = params;
  
  console.log('⚠️ Using fallback scenario generator');
  
  return {
    scenes: [
      {
        scene_number: 1,
        scene_type: 'intro',
        layout: 'fulltext',
        title: `${topic} Training Scenario`,
        body: `You are about to experience a realistic workplace scenario that will test your knowledge and decision-making skills regarding ${topic}. Pay attention to each situation and choose the response that best aligns with company policies and best practices.`,
        narration: `Welcome to this interactive training scenario on ${topic}. You'll face ${decision_points} key decisions. Choose wisely!`,
        bg_type: 'gradient',
        gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)'
      },
      {
        scene_number: 2,
        scene_type: 'outcome',
        layout: 'fulltext',
        title: 'Scenario Complete',
        body: 'You have completed this training scenario. Review your choices and consider how you might apply these learnings in your daily work.',
        narration: 'Thank you for completing this scenario.',
        bg_type: 'gradient',
        gradient: 'linear-gradient(135deg, #065f46, #047857)'
      }
    ]
  };
}
