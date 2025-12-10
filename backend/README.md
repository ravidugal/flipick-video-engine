# 🎬 Flipick AI Video Studio - Backend API

AI-powered video generation platform for creating professional educational videos.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL client (`psql`)
- Google Cloud account with:
  - Cloud SQL instance
  - Cloud Storage buckets
  - Service account with permissions
- API Keys:
  - Anthropic Claude API
  - ElevenLabs (optional)
  - Unsplash (optional)
  - Storyblocks (optional)

### Installation

```bash
# 1. Install dependencies and setup
./install.sh

# 2. Configure environment
# Edit .env with your GCP and API credentials

# 3. Start Cloud SQL Proxy (in separate terminal)
cloud-sql-proxy YOUR_CONNECTION_NAME

# 4. Start development server
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── env.ts       # Environment variables
│   │   ├── database.ts  # Database connection
│   │   └── storage.ts   # Cloud Storage
│   ├── controllers/     # Request handlers
│   │   ├── ai.controller.ts
│   │   └── project.controller.ts
│   ├── services/        # Business logic
│   │   └── claude.service.ts
│   ├── routes/          # API routes
│   │   ├── ai.routes.ts
│   │   └── project.routes.ts
│   ├── models/          # Data models
│   ├── database/
│   │   └── migrations/  # SQL migrations
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── .env                 # Environment config (create from .env.example)
├── package.json
├── tsconfig.json
└── install.sh           # Installation script
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_SERVICE_KEY_PATH=/path/to/service-key.json

# Database (via Cloud SQL Proxy)
DB_CONNECTION_NAME=project:region:instance
DB_NAME=flipick_video_studio
DB_USER=appuser
DB_PASSWORD=your-password
DB_HOST=/cloudsql/connection-name

# Cloud Storage
BUCKET_VIDEOS=your-videos-bucket
BUCKET_AUDIO=your-audio-bucket
BUCKET_TEMP=your-temp-bucket

# API Keys
ANTHROPIC_API_KEY=your-claude-key
ELEVENLABS_API_KEY=your-elevenlabs-key
UNSPLASH_ACCESS_KEY=your-unsplash-key

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

### Database Setup

The database schema is automatically created when you run the migration:

```bash
# Make sure Cloud SQL Proxy is running, then:
PGPASSWORD=your-password psql -h 127.0.0.1 -p 5432 -U appuser -d flipick_video_studio -f src/database/migrations/001_initial_schema.sql
```

## 📡 API Endpoints

### AI Generation

#### Generate Scene Titles
```http
POST /api/ai/generate-scenes
Content-Type: application/json

{
  "prompt": "Digital Marketing Course",
  "numScenes": 6
}
```

**Response:**
```json
{
  "success": true,
  "scenes": [
    { "sceneNumber": 1, "title": "Understanding Digital Marketing" },
    { "sceneNumber": 2, "title": "Social Media Strategy" },
    ...
  ]
}
```

#### Generate Scene Content
```http
POST /api/ai/generate-content
Content-Type: application/json

{
  "prompt": "Digital Marketing Course",
  "sceneTitle": "Social Media Strategy",
  "sceneNumber": 2,
  "totalScenes": 6
}
```

**Response:**
```json
{
  "success": true,
  "content": "Social media isn't just about posting content...",
  "wordCount": 245
}
```

#### Generate Scene Design
```http
POST /api/ai/generate-design
Content-Type: application/json

{
  "sceneTitle": "Social Media Strategy",
  "content": "Social media isn't just...",
  "sceneNumber": 2
}
```

**Response:**
```json
{
  "success": true,
  "design": {
    "layout": "split",
    "visualStyle": "modern",
    "theme": { ... },
    "typography": { ... },
    "elements": [ ... ]
  }
}
```

### Project Management

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "prompt": "Digital Marketing Course",
  "courseName": "Mastering Digital Marketing",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Introduction",
      "content": "...",
      "design": { ... },
      "duration": 15.0
    }
  ]
}
```

#### Get All Projects
```http
GET /api/projects
```

#### Get Single Project
```http
GET /api/projects/:id
```

#### Update Project
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "courseName": "Updated Name",
  "scenes": [ ... ]
}
```

#### Delete Project
```http
DELETE /api/projects/:id
```

## 🛠️ Development

### Scripts

```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migration
npm run migrate
```

### Adding New Features

1. **New API endpoint:**
   - Add controller in `src/controllers/`
   - Add route in `src/routes/`
   - Import route in `src/app.ts`

2. **New service:**
   - Add service in `src/services/`
   - Import in controller

3. **Database changes:**
   - Create new migration in `src/database/migrations/`
   - Run migration with `psql`

## 🚢 Deployment

### Deploy to GCP Cloud Run

```bash
# Build and deploy
gcloud run deploy flipick-video-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --timeout 300s \
  --add-cloudsql-instances YOUR_CONNECTION_NAME \
  --set-env-vars NODE_ENV=production
```

## 🔍 Troubleshooting

### Database Connection Issues

**Error:** `Connection refused on port 5432`
- **Solution:** Make sure Cloud SQL Proxy is running:
  ```bash
  cloud-sql-proxy YOUR_CONNECTION_NAME
  ```

**Error:** `password authentication failed`
- **Solution:** Check `.env` file has correct DB_PASSWORD

### API Key Issues

**Error:** `Invalid API key`
- **Solution:** Verify API keys in `.env` are correct and active

### Cloud Storage Issues

**Error:** `Bucket not found`
- **Solution:** Check bucket names in `.env` match GCP buckets
- **Solution:** Verify service account has Storage Admin permission

## 📊 Database Schema

### Projects Table
- `id` - Serial primary key
- `prompt` - Original user prompt
- `course_name` - Course title
- `status` - draft | completed
- `created_at`, `updated_at` - Timestamps

### Scenes Table
- `id` - Serial primary key
- `project_id` - Foreign key to projects
- `scene_number` - Order in sequence
- `title` - Scene title
- `content` - Scene narration text
- `design_json` - AI-generated design (JSONB)
- `audio_url` - Voiceover file URL
- `duration` - Scene duration in seconds
- `background_image_url` - Background image
- `broll_video_url` - B-roll video clip
- `created_at` - Timestamp

### Videos Table
- `id` - Serial primary key
- `project_id` - Foreign key to projects
- `video_url` - Final rendered video URL
- `thumbnail_url` - Preview thumbnail
- `duration` - Total video duration
- `resolution` - Video resolution
- `file_size` - File size in bytes
- `status` - pending | rendering | completed | failed
- `render_started_at`, `render_completed_at` - Timestamps
- `created_at` - Timestamp

## 📝 License

Proprietary - Flipick © 2024

## 🤝 Support

For issues or questions, contact: support@flipick.com
