-- Migration: Add PDF support to projects table
-- Created: 2024-12-10
-- Purpose: Enable PDF as content source for video generation

-- Add PDF-related columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS pdf_pages INTEGER,
ADD COLUMN IF NOT EXISTS pdf_size_mb DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS content_source_type VARCHAR(50) DEFAULT 'ai';

-- Create index for filtering PDF projects
CREATE INDEX IF NOT EXISTS idx_projects_pdf 
ON projects(pdf_url) 
WHERE pdf_url IS NOT NULL;

-- Create index for filtering by content source type
CREATE INDEX IF NOT EXISTS idx_projects_content_source 
ON projects(content_source_type);

-- Update existing projects to have content_source_type = 'ai'
UPDATE projects 
SET content_source_type = 'ai' 
WHERE content_source_type IS NULL;

-- Add comment to table
COMMENT ON COLUMN projects.pdf_url IS 'GCS path to uploaded PDF file';
COMMENT ON COLUMN projects.pdf_filename IS 'Original PDF filename';
COMMENT ON COLUMN projects.pdf_pages IS 'Number of pages in PDF';
COMMENT ON COLUMN projects.pdf_size_mb IS 'PDF file size in megabytes';
COMMENT ON COLUMN projects.content_source_type IS 'Source type: ai, pdf, url, etc.';

-- Verify migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
    AND column_name IN ('pdf_url', 'pdf_filename', 'pdf_pages', 'pdf_size_mb', 'content_source_type')
ORDER BY column_name;
