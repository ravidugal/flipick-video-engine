import express from 'express';
import { pool } from '../config/database';

const router = express.Router();

router.post('/run-pdf-migration', async (req, res) => {
  try {
    console.log('🔄 Starting PDF migration...');

    console.log('1️⃣ Adding columns to projects table...');
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS pdf_url TEXT,
      ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pdf_pages INTEGER,
      ADD COLUMN IF NOT EXISTS pdf_size_mb DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS content_source_type VARCHAR(50) DEFAULT 'ai';
    `);
    console.log('✅ Columns added');

    console.log('2️⃣ Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_pdf 
      ON projects(pdf_url) 
      WHERE pdf_url IS NOT NULL;
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_content_source 
      ON projects(content_source_type);
    `);
    console.log('✅ Indexes created');

    console.log('3️⃣ Updating existing projects...');
    const updateResult = await pool.query(`
      UPDATE projects 
      SET content_source_type = 'ai' 
      WHERE content_source_type IS NULL;
    `);
    console.log(`✅ Updated ${updateResult.rowCount} existing projects`);

    console.log('4️⃣ Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
        AND column_name IN ('pdf_url', 'pdf_filename', 'pdf_pages', 'pdf_size_mb', 'content_source_type')
      ORDER BY column_name;
    `);

    console.log('✅ Migration completed successfully!');

    res.json({
      success: true,
      message: 'PDF migration completed successfully!',
      columnsAdded: verifyResult.rows,
      projectsUpdated: updateResult.rowCount
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message,
      detail: error.detail || 'No additional details'
    });
  }
});

router.get('/check-migration', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
        AND column_name IN ('pdf_url', 'pdf_filename', 'pdf_pages', 'pdf_size_mb', 'content_source_type');
    `);

    const hasAllColumns = result.rows.length === 5;
    const existingColumns = result.rows.map((r: any) => r.column_name);

    res.json({
      success: true,
      migrated: hasAllColumns,
      existingColumns: existingColumns,
      missingColumns: ['pdf_url', 'pdf_filename', 'pdf_pages', 'pdf_size_mb', 'content_source_type']
        .filter(col => !existingColumns.includes(col))
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
