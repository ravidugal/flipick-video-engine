-- Migration: Add Brand Theme Support
-- Description: Add brand_color and brand_theme columns to projects table
-- Date: 2024-12-09

-- Add brand theme columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7),
ADD COLUMN IF NOT EXISTS brand_theme JSONB;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_projects_brand_color 
ON projects (brand_color);

-- Add comment for documentation
COMMENT ON COLUMN projects.brand_color IS 'User selected brand accent color (hex format, e.g., #FF6B35)';
COMMENT ON COLUMN projects.brand_theme IS 'Auto-generated complete brand theme with primary, secondary, accent, background, text colors';

-- Example of what gets stored in brand_theme:
-- {
--   "primary": "#FF6B35",
--   "primaryLight": "#FFA265",
--   "primaryDark": "#CC5620",
--   "secondary": "#FFBF35",
--   "accent": "#35C4FF",
--   "background": "#FFF8F5",
--   "text": "#1A1A1A"
-- }
