-- Database Schema Check Script
-- Run this to see current structure before MCQ migration

\echo '=== PROJECTS TABLE STRUCTURE ==='
\d projects

\echo ''
\echo '=== SCENES TABLE STRUCTURE ==='
\d scenes

\echo ''
\echo '=== ALL TABLES IN DATABASE ==='
\dt

\echo ''
\echo '=== CHECK FOR MCQ COLUMNS ==='
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name IN ('include_quiz', 'quiz_count', 'project_type');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scenes' 
AND column_name IN ('scene_type', 'quiz_data', 'choices', 'next_scene_id');

\echo ''
\echo '=== CHECK FOR QUIZ_ATTEMPTS TABLE ==='
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'quiz_attempts'
) as quiz_attempts_exists;
