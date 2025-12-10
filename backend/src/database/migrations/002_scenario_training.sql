-- Migration: Scenario-Based Training
-- Date: 2024-11-29

-- Add project_type column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);

-- Add scenario fields to scenes table
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS choices JSONB;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS next_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS choice_quality VARCHAR(20);
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS feedback TEXT;

CREATE INDEX IF NOT EXISTS idx_scenes_next_scene ON scenes(next_scene_id);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) DEFAULT 'beginner',
    decision_points INTEGER DEFAULT 3,
    max_score INTEGER DEFAULT 0,
    industry VARCHAR(100),
    topic VARCHAR(255),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scenarios_project ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_difficulty ON scenarios(difficulty);
CREATE INDEX IF NOT EXISTS idx_scenarios_topic ON scenarios(topic);

-- Create scenario_attempts table
CREATE TABLE IF NOT EXISTS scenario_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2),
    path_taken JSONB NOT NULL DEFAULT '[]',
    choices_made JSONB NOT NULL DEFAULT '[]',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_scenario ON scenario_attempts(scenario_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON scenario_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON scenario_attempts(status);
CREATE INDEX IF NOT EXISTS idx_attempts_completed ON scenario_attempts(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_user_scenario ON scenario_attempts(user_id, scenario_id, completed_at DESC);

-- Create leaderboard view
CREATE OR REPLACE VIEW scenario_leaderboard AS
SELECT 
    sa.scenario_id,
    s.title as scenario_title,
    sa.user_id,
    u.name as user_name,
    u.email as user_email,
    MAX(sa.score) as best_score,
    MAX(sa.percentage) as best_percentage,
    COUNT(*) as attempt_count,
    MAX(sa.completed_at) as last_attempt,
    MIN(sa.duration_seconds) as fastest_time
FROM scenario_attempts sa
JOIN scenarios s ON sa.scenario_id = s.id
JOIN users u ON sa.user_id = u.id
WHERE sa.status = 'completed'
GROUP BY sa.scenario_id, s.title, sa.user_id, u.name, u.email
ORDER BY best_percentage DESC, fastest_time ASC;

-- Triggers for auto-calculation
CREATE OR REPLACE FUNCTION calculate_scenario_percentage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.max_score > 0 THEN
        NEW.percentage = ROUND((NEW.score::DECIMAL / NEW.max_score::DECIMAL) * 100, 2);
    ELSE
        NEW.percentage = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_percentage_on_score
    BEFORE INSERT OR UPDATE OF score, max_score ON scenario_attempts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_scenario_percentage();

CREATE OR REPLACE FUNCTION calculate_scenario_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_duration_on_complete
    BEFORE UPDATE OF completed_at ON scenario_attempts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_scenario_duration();

-- Update existing projects
UPDATE projects SET project_type = 'standard' WHERE project_type IS NULL;

SELECT 'Migration 002_scenario_training.sql completed successfully' as status;
