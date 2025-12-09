import { Request, Response } from 'express';
import pool from '../config/database';

export class TenantController {
  /**
   * Get all tenants (Super Admin only)
   */
  async getAllTenants(req: Request, res: Response) {
    try {
      const result = await pool.query(
        `SELECT t.*, 
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT p.id) as project_count
         FROM tenants t
         LEFT JOIN users u ON t.id = u.tenant_id
         LEFT JOIN projects p ON t.id = p.tenant_id
         WHERE t.status != 'deleted'
         GROUP BY t.id
         ORDER BY t.created_at DESC`
      );
      
      res.json({
        success: true,
        tenants: result.rows
      });
    } catch (error: any) {
      console.error('❌ Get tenants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenants',
        message: error.message
      });
    }
  }
  
  /**
   * Get single tenant by ID
   */
  async getTenantById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT t.*,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT p.id) as project_count
         FROM tenants t
         LEFT JOIN users u ON t.id = u.tenant_id
         LEFT JOIN projects p ON t.id = p.tenant_id
         WHERE t.id = $1 AND t.status != 'deleted'
         GROUP BY t.id`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }
      
      res.json({
        success: true,
        tenant: result.rows[0]
      });
    } catch (error: any) {
      console.error('❌ Get tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant',
        message: error.message
      });
    }
  }
  
  /**
   * Create new tenant
   */
  async createTenant(req: Request, res: Response) {
    try {
      const { name, domain, settings } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Tenant name is required'
        });
      }
      
      // Check if domain is already taken
      if (domain) {
        const existing = await pool.query(
          'SELECT id FROM tenants WHERE domain = $1 AND status != $2',
          [domain, 'deleted']
        );
        
        if (existing.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Domain is already taken'
          });
        }
      }
      
      const result = await pool.query(
        `INSERT INTO tenants (name, domain, settings, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, domain || null, settings || {}, 'active']
      );
      
      console.log(`✅ Created tenant: ${name}`);
      
      res.json({
        success: true,
        tenant: result.rows[0],
        message: 'Tenant created successfully'
      });
    } catch (error: any) {
      console.error('❌ Create tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create tenant',
        message: error.message
      });
    }
  }
  
  /**
   * Update tenant
   */
  async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, domain, settings, status } = req.body;
      
      // Check if tenant exists
      const existing = await pool.query(
        'SELECT id FROM tenants WHERE id = $1 AND status != $2',
        [id, 'deleted']
      );
      
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }
      
      // Check if domain is taken by another tenant
      if (domain) {
        const domainCheck = await pool.query(
          'SELECT id FROM tenants WHERE domain = $1 AND id != $2 AND status != $3',
          [domain, id, 'deleted']
        );
        
        if (domainCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Domain is already taken'
          });
        }
      }
      
      const result = await pool.query(
        `UPDATE tenants 
         SET name = COALESCE($1, name),
             domain = COALESCE($2, domain),
             settings = COALESCE($3, settings),
             status = COALESCE($4, status),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [name, domain, settings, status, id]
      );
      
      console.log(`✅ Updated tenant: ${id}`);
      
      res.json({
        success: true,
        tenant: result.rows[0],
        message: 'Tenant updated successfully'
      });
    } catch (error: any) {
      console.error('❌ Update tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tenant',
        message: error.message
      });
    }
  }
  
  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Prevent deleting System tenant
      if (id === '00000000-0000-0000-0000-000000000000') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete System tenant'
        });
      }
      
      // Check if tenant exists
      const existing = await pool.query(
        'SELECT id, name FROM tenants WHERE id = $1 AND status != $2',
        [id, 'deleted']
      );
      
      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }
      
      // Soft delete (mark as deleted)
      await pool.query(
        `UPDATE tenants 
         SET status = 'deleted', updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      
      // Also deactivate all users in this tenant
      await pool.query(
        `UPDATE users 
         SET status = 'inactive', updated_at = NOW()
         WHERE tenant_id = $1`,
        [id]
      );
      
      console.log(`✅ Deleted tenant: ${existing.rows[0].name}`);
      
      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });
    } catch (error: any) {
      console.error('❌ Delete tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete tenant',
        message: error.message
      });
    }
  }
}

export default new TenantController();
