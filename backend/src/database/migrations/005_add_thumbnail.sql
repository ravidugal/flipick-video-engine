-- Migration: Add thumbnail URL to projects table
-- Filename: 005_add_thumbnail.sql
-- Date: 2024-12-09
-- Description: Adds thumbnail_url column to store project thumbnail image

-- Add thumbnail_url column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_projects_thumbnail 
ON projects(thumbnail_url);

-- Add comment explaining the column
COMMENT ON COLUMN projects.thumbnail_url IS 'URL to project thumbnail image from first scene with image asset';

-- Update existing projects to have NULL (will be populated on regeneration)
-- No action needed - NULL is default

-- Verify column was added
\d projects
