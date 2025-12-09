-- Migration: MCQ Assessment (End of Video)
-- Date: 2024-11-29

-- Add quiz fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS include_quiz BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiz_count INTEGER DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_projects_include_quiz ON projects(include_quiz);

-- Add MCQ fields to scenes table (for quiz questions)
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS scene_type VARCHAR(50) DEFAULT 'content',
ADD COLUMN IF NOT EXISTS quiz_data JSONB;

CREATE INDEX IF NOT EXISTS idx_scenes_type ON scenes(scene_type);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2),
    answers JSONB NOT NULL DEFAULT '[]',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_project ON quiz_attempts(project_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_project ON quiz_attempts(user_id, project_id, completed_at DESC);

-- Triggers for auto-calculation
CREATE OR REPLACE FUNCTION calculate_quiz_percentage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_questions > 0 THEN
        NEW.score_percentage = ROUND((NEW.correct_answers::DECIMAL / NEW.total_questions::DECIMAL) * 100, 2);
    ELSE
        NEW.score_percentage = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_percentage_on_answers
    BEFORE INSERT OR UPDATE OF correct_answers, total_questions ON quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quiz_percentage();

CREATE OR REPLACE FUNCTION calculate_quiz_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_duration_on_quiz_complete
    BEFORE UPDATE OF completed_at ON quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quiz_duration();

-- Update existing projects
UPDATE projects SET include_quiz = false WHERE include_quiz IS NULL;
UPDATE projects SET quiz_count = 5 WHERE quiz_count IS NULL;
UPDATE scenes SET scene_type = 'content' WHERE scene_type IS NULL;

SELECT 'Migration 003_mcq_assessment.sql completed successfully' as status;
