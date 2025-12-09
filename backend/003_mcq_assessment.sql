-- ================================================================
-- MCQ Assessment Migration for Flipick AI Video Studio
-- File: 003_mcq_assessment.sql
-- Database: flipick_video_studio
-- User: appuser
-- Purpose: Add Multiple Choice Quiz functionality to videos
-- ================================================================

\echo 'Starting MCQ Assessment Migration...'

-- ================================================================
-- 1. ALTER PROJECTS TABLE - Add Quiz Fields
-- ================================================================

\echo 'Adding quiz fields to projects table...'

-- Add include_quiz flag
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS include_quiz BOOLEAN DEFAULT false;

-- Add quiz_count (number of questions)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS quiz_count INTEGER DEFAULT 5 CHECK (quiz_count >= 1 AND quiz_count <= 20);

-- Add project_type if not exists (for scenario vs standard vs quiz)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'standard';

COMMENT ON COLUMN projects.include_quiz IS 'Whether to include end-of-video quiz';
COMMENT ON COLUMN projects.quiz_count IS 'Number of quiz questions (1-20)';
COMMENT ON COLUMN projects.project_type IS 'Type: standard, scenario, or quiz';

-- ================================================================
-- 2. ALTER SCENES TABLE - Add Quiz Data
-- ================================================================

\echo 'Adding quiz data field to scenes table...'

-- scene_type already exists, so skip it
-- Add quiz_data (JSONB) for storing MCQ questions
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS quiz_data JSONB;

COMMENT ON COLUMN scenes.quiz_data IS 'MCQ data: {question, options[], explanation, difficulty}';

-- Create index for scene_type queries if not exists
CREATE INDEX IF NOT EXISTS idx_scenes_scene_type ON scenes(scene_type);

-- ================================================================
-- 3. CREATE QUIZ_ATTEMPTS TABLE
-- ================================================================

\echo 'Creating quiz_attempts table...'

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  answers JSONB NOT NULL,
  time_taken_seconds INTEGER,
  completed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT quiz_attempts_valid_counts CHECK (
    correct_answers >= 0 AND 
    correct_answers <= total_questions AND
    total_questions > 0
  ),
  CONSTRAINT quiz_attempts_valid_percentage CHECK (
    percentage >= 0 AND percentage <= 100
  )
);

-- Create indexes for quiz_attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_project ON quiz_attempts(project_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_percentage ON quiz_attempts(percentage DESC);

COMMENT ON TABLE quiz_attempts IS 'Stores user quiz attempt results';
COMMENT ON COLUMN quiz_attempts.answers IS 'Array of {scene_id, question, selected, correct, is_correct}';

-- ================================================================
-- 4. CREATE TRIGGER FOR AUTO-CALCULATING PERCENTAGE
-- ================================================================

\echo 'Creating auto-calculation trigger...'

CREATE OR REPLACE FUNCTION calculate_quiz_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate percentage based on correct answers
  NEW.percentage := ROUND((NEW.correct_answers::DECIMAL / NEW.total_questions::DECIMAL) * 100, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_quiz_percentage ON quiz_attempts;

CREATE TRIGGER trigger_calculate_quiz_percentage
  BEFORE INSERT OR UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quiz_percentage();

-- ================================================================
-- 5. CREATE QUIZ LEADERBOARD VIEW
-- ================================================================

\echo 'Creating quiz leaderboard view...'

CREATE OR REPLACE VIEW quiz_leaderboard AS
SELECT 
  qa.id,
  qa.project_id,
  p.name as project_name,
  qa.user_id,
  u.email as user_email,
  u.full_name as user_name,
  qa.total_questions,
  qa.correct_answers,
  qa.percentage,
  qa.time_taken_seconds,
  qa.completed_at,
  RANK() OVER (PARTITION BY qa.project_id ORDER BY qa.percentage DESC, qa.time_taken_seconds ASC) as rank
FROM quiz_attempts qa
JOIN projects p ON qa.project_id = p.id
JOIN users u ON qa.user_id = u.id
ORDER BY qa.project_id, qa.percentage DESC, qa.time_taken_seconds ASC;

COMMENT ON VIEW quiz_leaderboard IS 'Leaderboard showing quiz results ranked by score and time';

-- ================================================================
-- 6. GRANT PERMISSIONS
-- ================================================================

\echo 'Granting permissions...'

GRANT ALL PRIVILEGES ON TABLE quiz_attempts TO appuser;
GRANT SELECT ON quiz_leaderboard TO appuser;

-- ================================================================
-- 7. VERIFICATION
-- ================================================================

\echo ''
\echo '=== VERIFICATION ==='
\echo ''

-- Check projects columns
\echo 'Projects table MCQ columns:'
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('include_quiz', 'quiz_count', 'project_type')
ORDER BY column_name;

-- Check scenes columns
\echo ''
\echo 'Scenes table MCQ columns:'
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'scenes' 
AND column_name IN ('scene_type', 'quiz_data')
ORDER BY column_name;

-- Check quiz_attempts table
\echo ''
\echo 'Quiz attempts table structure:'
\d quiz_attempts

-- Count records
\echo ''
\echo 'Table record counts:'
SELECT 
  'projects' as table_name, 
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE include_quiz = true) as projects_with_quiz
FROM projects
UNION ALL
SELECT 
  'scenes' as table_name, 
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE scene_type = 'quiz_mcq') as quiz_scenes
FROM scenes
UNION ALL
SELECT 
  'quiz_attempts' as table_name, 
  COUNT(*) as total_records,
  NULL as extra_info
FROM quiz_attempts;

\echo ''
\echo '✅ MCQ Assessment Migration Complete!'
\echo ''
\echo 'Database: flipick_video_studio'
\echo 'User: appuser'
\echo ''
\echo 'What was added:'
\echo '  ✅ projects.include_quiz (BOOLEAN)'
\echo '  ✅ projects.quiz_count (INTEGER)'
\echo '  ✅ projects.project_type (VARCHAR)'
\echo '  ✅ scenes.quiz_data (JSONB)'
\echo '  ✅ quiz_attempts table'
\echo '  ✅ Auto-calculation trigger'
\echo '  ✅ Quiz leaderboard view'
\echo ''
\echo 'Next Steps:'
\echo '1. Update projects.html form with quiz checkbox'
\echo '2. Update ai.controller.ts to generate MCQ questions'
\echo '3. Update video-studio.html to render MCQ scenes'
\echo ''
