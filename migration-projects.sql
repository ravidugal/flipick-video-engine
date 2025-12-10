-- Projects and Scenes Tables Migration
-- Run this SQL in your PostgreSQL database

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Create scenes table (if you need it)
CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  title VARCHAR(255),
  content TEXT,
  background_type VARCHAR(50),
  background_url TEXT,
  voice_text TEXT,
  voice_url TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for scenes
CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_number ON scenes(project_id, scene_number);

-- Grant permissions (adjust role name if needed)
GRANT ALL PRIVILEGES ON TABLE projects TO appuser;
GRANT ALL PRIVILEGES ON TABLE scenes TO appuser;

-- Create a test project for ACME Corp (optional)
INSERT INTO projects (name, tenant_id, created_by, status)
SELECT 
  'Sample Marketing Video',
  t.id,
  u.id,
  'draft'
FROM tenants t
JOIN users u ON u.tenant_id = t.id
WHERE t.domain = 'acme' AND u.role = 'tenant_admin'
LIMIT 1;

-- Verify tables were created
SELECT 'Projects table created' as status, COUNT(*) as count FROM projects
UNION ALL
SELECT 'Scenes table created' as status, COUNT(*) as count FROM scenes;
