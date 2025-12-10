-- Migration: Scenario-Based Training
-- Date: 2024-11-29
-- Description: Add tables and columns for decision-tree scenario training

-- ============================================================================
-- 1. ADD PROJECT TYPE TO PROJECTS TABLE
-- ============================================================================

-- Add project_type column to distinguish standard vs scenario projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'standard';

-- Add comment for clarity
COMMENT ON COLUMN projects.project_type IS 'Type of project: standard, scenario, interview';

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);

-- ============================================================================
-- 2. ADD SCENARIO FIELDS TO SCENES TABLE
-- ============================================================================

-- Add choice data for decision points
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS choices JSONB;

-- Add next scene ID for branching navigation
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS next_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;

-- Add choice quality rating
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS choice_quality VARCHAR(20);

-- Add points value for scoring
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Add feedback text shown after choice
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add comments
COMMENT ON COLUMN scenes.choices IS 'JSON array of decision choices with {id, text, quality, next_scene_id, points}';
COMMENT ON COLUMN scenes.next_scene_id IS 'ID of scene to navigate to (for linear flow or choice outcomes)';
COMMENT ON COLUMN scenes.choice_quality IS 'Quality rating: optimal, suboptimal, poor (for consequence scenes)';
COMMENT ON COLUMN scenes.points IS 'Points awarded for reaching this scene or making this choice';
COMMENT ON COLUMN scenes.feedback IS 'Feedback text explaining the outcome of a choice';

-- Create index for next_scene_id lookups
CREATE INDEX IF NOT EXISTS idx_scenes_next_scene ON scenes(next_scene_id);

-- ============================================================================
-- 3. CREATE SCENARIOS METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scenario settings
    difficulty VARCHAR(20) DEFAULT 'beginner',
    decision_points INTEGER DEFAULT 3,
    max_score INTEGER DEFAULT 0,
    
    -- Metadata
    industry VARCHAR(100),
    topic VARCHAR(255),
    tags TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE scenarios IS 'Metadata for scenario-based training projects';
COMMENT ON COLUMN scenarios.difficulty IS 'Difficulty level: beginner, intermediate, advanced';
COMMENT ON COLUMN scenarios.decision_points IS 'Number of decision points in the scenario';
COMMENT ON COLUMN scenarios.max_score IS 'Maximum possible score for this scenario';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scenarios_project ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_difficulty ON scenarios(difficulty);
CREATE INDEX IF NOT EXISTS idx_scenarios_topic ON scenarios(topic);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scenarios_updated_at
    BEFORE UPDATE ON scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_scenarios_updated_at();

-- ============================================================================
-- 4. CREATE SCENARIO ATTEMPTS TABLE (USER PROGRESS TRACKING)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scenario_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Attempt data
    score INTEGER DEFAULT 0,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2),
    
    -- Path taken (array of choice IDs)
    path_taken JSONB NOT NULL DEFAULT '[]',
    
    -- Detailed choices with scene info
    choices_made JSONB NOT NULL DEFAULT '[]',
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'in_progress',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE scenario_attempts IS 'Track user attempts at scenario training';
COMMENT ON COLUMN scenario_attempts.path_taken IS 'Array of scene IDs showing the path taken';
COMMENT ON COLUMN scenario_attempts.choices_made IS 'Detailed array of {scene_id, choice_id, quality, points, timestamp}';
COMMENT ON COLUMN scenario_attempts.percentage IS 'Score as percentage (score/max_score * 100)';
COMMENT ON COLUMN scenario_attempts.status IS 'Status: in_progress, completed, abandoned';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attempts_scenario ON scenario_attempts(scenario_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON scenario_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON scenario_attempts(status);
CREATE INDEX IF NOT EXISTS idx_attempts_completed ON scenario_attempts(completed_at DESC);

-- Create composite index for user's scenario history
CREATE INDEX IF NOT EXISTS idx_attempts_user_scenario 
    ON scenario_attempts(user_id, scenario_id, completed_at DESC);

-- ============================================================================
-- 5. CREATE SCENARIO LEADERBOARD VIEW
-- ============================================================================

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

COMMENT ON VIEW scenario_leaderboard IS 'Leaderboard showing best scores and attempts per user per scenario';

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate percentage and update it
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

-- Function to calculate duration on completion
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

-- ============================================================================
-- 7. SEED DATA FOR TESTING (OPTIONAL)
-- ============================================================================

-- Update existing projects to have standard type
UPDATE projects SET project_type = 'standard' WHERE project_type IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
    RAISE NOTICE 'Migration 002_scenario_training.sql completed successfully';
    RAISE NOTICE 'New tables: scenarios, scenario_attempts';
    RAISE NOTICE 'Modified tables: projects (project_type), scenes (choices, next_scene_id, etc)';
    RAISE NOTICE 'New views: scenario_leaderboard';
END $$;
