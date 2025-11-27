-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    prompt TEXT NOT NULL,
    course_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenes table
CREATE TABLE IF NOT EXISTS scenes (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    design_json JSONB,
    audio_url TEXT,
    duration REAL DEFAULT 15.0,
    background_image_url TEXT,
    broll_video_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, scene_number)
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    video_url TEXT,
    thumbnail_url TEXT,
    duration INTEGER,
    resolution VARCHAR(20) DEFAULT '1920x1080',
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'pending',
    render_started_at TIMESTAMP,
    render_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);