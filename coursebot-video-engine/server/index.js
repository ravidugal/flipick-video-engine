const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';

// Gradient backgrounds for variety
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

async function callClaude(prompt, maxTokens) {
  try {
    var response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens || 1000,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    });
    return response.data.content[0].text;
  } catch (err) {
    console.error('Claude API error:', err.message);
    return null;
  }
}

app.post('/api/claude/topics', async function(req, res) {
  var subject = req.body.subject;
  var context = req.body.context || '';
  var trainingType = req.body.trainingType || 'compliance';
  var sceneCount = req.body.sceneCount || 15;
  
  var prompt = 'You are an instructional designer creating a professional ' + trainingType + ' training course.\n\n';
  prompt += 'Subject: ' + subject + '\n';
  if (context) prompt += 'Additional Context: ' + context + '\n';
  prompt += 'Target scenes: ' + sceneCount + '\n\n';
  prompt += 'Generate a course outline with 4-6 topics and 2-4 subtopics each.\n';
  prompt += 'Return ONLY valid JSON: {"topics":[{"name":"Topic","subtopics":["Sub1","Sub2"]}]}';
  
  var result = await callClaude(prompt, 1500);
  
  if (result) {
    try {
      var match = result.match(/\{[\s\S]*\}/);
      if (match) {
        return res.json({ success: true, topics: JSON.parse(match[0]).topics, source: 'claude' });
      }
    } catch (e) {}
  }
  
  res.json({ success: true, topics: [
    { name: 'Understanding ' + subject, subtopics: ['Key Concepts', 'Why It Matters', 'Core Principles'] },
    { name: 'Implementation', subtopics: ['Best Practices', 'Common Challenges', 'Solutions'] },
    { name: 'Advanced Topics', subtopics: ['Expert Techniques', 'Case Studies', 'Future Trends'] }
  ], source: 'fallback' });
});

async function generateAllScenes(courseName, topics, sceneCount) {
  var sceneList = [];
  
  sceneList.push({ type: 'intro', topic: courseName, subtopic: null });
  
  topics.forEach(function(topic, ti) {
    sceneList.push({ type: 'chapter', topic: topic.name, subtopic: null, chapterNum: ti + 1 });
    (topic.subtopics || []).forEach(function(sub, si) {
      var subName = typeof sub === 'string' ? sub : sub.name;
      sceneList.push({ type: 'content', topic: topic.name, subtopic: subName, chapterNum: ti + 1, subNum: si + 1 });
    });
  });
  
  sceneList.push({ type: 'closing', topic: courseName, subtopic: null });
  sceneList = sceneList.slice(0, sceneCount);
  
  var contentScenes = sceneList.filter(function(s) { return s.type === 'content'; });
  var contentCount = contentScenes.length;
  
  var prompt = 'You are designing a cinematic corporate training video for: ' + courseName + '\n\n';
  prompt += 'I need you to assign layouts, background types, and generate content for ' + contentCount + ' content scenes.\n';
  prompt += 'The scenes are:\n';
  
  contentScenes.forEach(function(s, i) {
    prompt += (i + 1) + '. Chapter: "' + s.topic + '" - Topic: "' + s.subtopic + '"\n';
  });
  
  prompt += '\n=== LAYOUTS (distribute evenly, NO consecutive repeats) ===\n';
  prompt += '- "bullets": Title + 3 bullet points\n';
  prompt += '- "fulltext": Title + paragraph explanation\n';
  prompt += '- "stat": Big statistic number + label\n';
  prompt += '- "quote": Inspirational quote + author\n';
  prompt += '- "cards2": Title + 2 comparison cards\n';
  prompt += '- "cards4": Title + 4 feature cards (max 2 times total)\n';
  prompt += '- "timeline": Title + 3-4 step timeline\n';
  prompt += '- "split": Title + text on left, featured image on right\n';
  prompt += '- "fullimage": Minimal text over dramatic image\n';
  
  prompt += '\n=== BACKGROUND TYPES (mix these for visual variety) ===\n';
  prompt += '- "video": Moving B-roll footage (use ~40% of scenes)\n';
  prompt += '- "image": Static photo background (use ~30% of scenes)\n';
  prompt += '- "gradient": Flat color gradient, no media (use ~30% of scenes, good for data/stats)\n';
  
  prompt += '\n=== RULES ===\n';
  prompt += '1. NO two consecutive scenes with same layout\n';
  prompt += '2. NO two consecutive scenes with same bgType\n';
  prompt += '3. Use gradient for stat and quote layouts\n';
  prompt += '4. Use image for split and fullimage layouts\n';
  prompt += '5. Mix video backgrounds throughout\n';
  
  prompt += '\nReturn ONLY valid JSON array:\n';
  prompt += '[\n';
  prompt += '  {\n';
  prompt += '    "layout": "bullets|fulltext|stat|quote|cards2|cards4|timeline|split|fullimage",\n';
  prompt += '    "bgType": "video|image|gradient",\n';
  prompt += '    "assetKeywords": "specific keywords for Pexels search (skip if gradient)",\n';
  prompt += '    "title": "Scene title (max 50 chars)",\n';
  prompt += '    "body": "Body text if needed (max 120 chars)",\n';
  prompt += '    "bullets": ["point1", "point2", "point3"],\n';
  prompt += '    "cards": [{"title":"Title","desc":"Description"}],\n';
  prompt += '    "timelineItems": [{"year":"Step 1","event":"What happens"}],\n';
  prompt += '    "statValue": "85%",\n';
  prompt += '    "statLabel": "of employees improved",\n';
  prompt += '    "quote": "Quote text here",\n';
  prompt += '    "quoteAuthor": "Author Name",\n';
  prompt += '    "splitImage": "keywords for the featured image (if split layout)"\n';
  prompt += '  }\n';
  prompt += ']\n';
  prompt += '\nGenerate exactly ' + contentCount + ' objects with varied layouts and bgTypes.';
  
  var result = await callClaude(prompt, 4000);
  var aiScenes = [];
  
  if (result) {
    try {
      var match = result.match(/\[[\s\S]*\]/);
      if (match) {
        aiScenes = JSON.parse(match[0]);
      }
    } catch (e) {
      console.error('Scene parse error:', e.message);
    }
  }
  
  var finalScenes = [];
  var aiIndex = 0;
  var gradientIndex = 0;
  
  sceneList.forEach(function(s, idx) {
    if (s.type === 'intro') {
      finalScenes.push({
        type: 'intro',
        layout: 'headline',
        bgType: 'video',
        assetKeywords: courseName + ' corporate modern office team',
        title: courseName,
        subtitle: topics.length + ' Chapters',
        body: 'A comprehensive training program to build essential knowledge and skills.'
      });
    } else if (s.type === 'chapter') {
      // Chapters use gradient backgrounds for visual break
      finalScenes.push({
        type: 'chapter',
        layout: 'headline',
        bgType: 'gradient',
        gradient: GRADIENTS[gradientIndex % GRADIENTS.length],
        eyebrow: 'Chapter ' + s.chapterNum,
        title: s.topic
      });
      gradientIndex++;
    } else if (s.type === 'content') {
      var ai = aiScenes[aiIndex] || {};
      aiIndex++;
      
      var scene = {
        type: 'content',
        layout: ai.layout || 'bullets',
        bgType: ai.bgType || 'video',
        assetKeywords: ai.assetKeywords || s.subtopic + ' corporate professional',
        eyebrow: s.chapterNum + '.' + s.subNum,
        title: ai.title || s.subtopic,
        body: ai.body,
        bullets: ai.bullets,
        cards: ai.cards,
        timelineItems: ai.timelineItems,
        statValue: ai.statValue,
        statLabel: ai.statLabel,
        quote: ai.quote,
        quoteAuthor: ai.quoteAuthor,
        splitImage: ai.splitImage
      };
      
      // Assign gradient for gradient bgType
      if (scene.bgType === 'gradient') {
        scene.gradient = GRADIENTS[(gradientIndex + aiIndex) % GRADIENTS.length];
      }
      
      finalScenes.push(scene);
    } else if (s.type === 'closing') {
      finalScenes.push({
        type: 'closing',
        layout: 'headline',
        bgType: 'video',
        assetKeywords: 'success achievement celebration team applause',
        title: 'Training Complete',
        subtitle: 'Congratulations!',
        body: 'You have completed all ' + topics.length + ' chapters of ' + courseName + '.'
      });
    }
  });
  
  return finalScenes;
}

app.get('/api/pexels/videos', async function(req, res) {
  try {
    var r = await axios.get('https://api.pexels.com/videos/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query: req.query.query, per_page: req.query.per_page || 5, orientation: 'landscape' }
    });
    var videos = (r.data.videos || []).map(function(v) {
      var hd = v.video_files.find(function(f) { return f.quality === 'hd' && f.width >= 1280; }) || v.video_files[0];
      return { id: v.id, url: hd.link, thumbnail: v.image, duration: v.duration };
    });
    res.json({ success: true, videos: videos });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/scenes/generate', async function(req, res) {
  var content = req.body.content;
  var sceneCount = req.body.sceneCount || 15;
  var courseName = req.body.courseName || 'Training';
  var topics = content.topics || [];
  
  var scenes = await generateAllScenes(courseName, topics, sceneCount);
  
  // Track used asset IDs to prevent duplicates
  var usedVideoIds = new Set();
  var usedImageIds = new Set();
  
  // Fetch assets for each scene
  for (var i = 0; i < scenes.length; i++) {
    var scene = scenes[i];
    
    // Skip if gradient background
    if (scene.bgType === 'gradient') {
      continue;
    }
    
    try {
      if (scene.bgType === 'image') {
        // Fetch image
        var imgRes = await axios.get('https://api.pexels.com/v1/search', {
          headers: { Authorization: PEXELS_API_KEY },
          params: { query: scene.assetKeywords, per_page: 10, orientation: 'landscape' },
          timeout: 8000
        });
        
        if (imgRes.data.photos && imgRes.data.photos.length) {
          // Find unused image
          var availableImages = imgRes.data.photos.filter(function(p) {
            return !usedImageIds.has(p.id);
          });
          
          if (availableImages.length > 0) {
            var photo = availableImages[Math.floor(Math.random() * Math.min(3, availableImages.length))];
            usedImageIds.add(photo.id);
            scene.asset = { type: 'image', url: photo.src.large2x, thumbnail: photo.src.medium, id: photo.id };
          } else if (imgRes.data.photos.length > 0) {
            // Fallback to any image if all used
            var photo = imgRes.data.photos[0];
            scene.asset = { type: 'image', url: photo.src.large2x, thumbnail: photo.src.medium, id: photo.id };
          }
        }
        
        // Also fetch split image if needed
        if (scene.layout === 'split' && scene.splitImage) {
          var splitRes = await axios.get('https://api.pexels.com/v1/search', {
            headers: { Authorization: PEXELS_API_KEY },
            params: { query: scene.splitImage, per_page: 5, orientation: 'landscape' },
            timeout: 8000
          });
          
          if (splitRes.data.photos && splitRes.data.photos.length) {
            var splitPhoto = splitRes.data.photos[Math.floor(Math.random() * Math.min(3, splitRes.data.photos.length))];
            scene.splitAsset = { type: 'image', url: splitPhoto.src.large, thumbnail: splitPhoto.src.medium };
          }
        }
      } else {
        // Fetch video
        var vidRes = await axios.get('https://api.pexels.com/videos/search', {
          headers: { Authorization: PEXELS_API_KEY },
          params: { query: scene.assetKeywords, per_page: 10, orientation: 'landscape' },
          timeout: 8000
        });
        
        if (vidRes.data.videos && vidRes.data.videos.length) {
          // Find unused video
          var availableVideos = vidRes.data.videos.filter(function(v) {
            return !usedVideoIds.has(v.id);
          });
          
          if (availableVideos.length > 0) {
            var v = availableVideos[Math.floor(Math.random() * Math.min(3, availableVideos.length))];
            usedVideoIds.add(v.id);
            var hd = v.video_files.find(function(f) { return f.quality === 'hd'; }) || v.video_files[0];
            scene.asset = { type: 'video', url: hd.link, thumbnail: v.image, id: v.id };
          } else if (vidRes.data.videos.length > 0) {
            // Fallback to any video if all used
            var v = vidRes.data.videos[0];
            var hd = v.video_files.find(function(f) { return f.quality === 'hd'; }) || v.video_files[0];
            scene.asset = { type: 'video', url: hd.link, thumbnail: v.image, id: v.id };
          }
        }
      }
    } catch (e) {
      console.error('Asset fetch error for scene ' + i + ':', e.message);
    }
  }
  
  res.json({ success: true, scenes: scenes });
});

app.get('/api/status', function(req, res) {
  res.json({ 
    success: true, 
    services: { 
      pexels: { configured: true }, 
      claude: { configured: true }, 
      elevenLabs: { configured: false } 
    } 
  });
});

app.listen(PORT, function() {
  console.log('\n========================================');
  console.log('  Flipick Video Engine');
  console.log('  http://localhost:' + PORT);
  console.log('  Pexels: Ready | Claude: Ready');
  console.log('========================================\n');
});
