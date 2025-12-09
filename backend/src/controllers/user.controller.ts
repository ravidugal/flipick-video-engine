import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';

export class UserController {
  // List users (with role-based filtering)
  async list(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const role = req.user.role;
      const tenantId = req.user.tenantId;
      
      let query: string;
      let params: any[];
      
      if (role === 'super_admin') {
        // Super admin sees ALL users with tenant info
        query = `
          SELECT u.*, t.name as tenant_name
          FROM users u
          LEFT JOIN tenants t ON u.tenant_id = t.id
          ORDER BY u.created_at DESC
        `;
        params = [];
      } else if (role === 'tenant_admin') {
        // Tenant admin sees only users in their tenant
        query = `
          SELECT u.*, t.name as tenant_name
          FROM users u
          LEFT JOIN tenants t ON u.tenant_id = t.id
          WHERE u.tenant_id = $1
          ORDER BY u.created_at DESC
        `;
        params = [tenantId];
      } else {
        // Tenant users cannot access user management
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only administrators can manage users.'
        });
      }
      
      const result = await pool.query(query, params);
      
      res.json({
        success: true,
        users: result.rows
      });
    } catch (error: any) {
      console.error('List users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load users',
        message: error.message
      });
    }
  }
  
  // Get single user
  async get(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const role = req.user.role;
      const tenantId = req.user.tenantId;
      
      let query: string;
      let params: any[];
      
      if (role === 'super_admin') {
        query = 'SELECT * FROM users WHERE id = $1';
        params = [id];
      } else if (role === 'tenant_admin') {
        // Tenant admin can only access users in their tenant
        query = 'SELECT * FROM users WHERE id = $1 AND tenant_id = $2';
        params = [id, tenantId];
      } else {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Remove password from response
      const user = result.rows[0];
      delete user.password_hash;
      
      res.json({
        success: true,
        user: user
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load user'
      });
    }
  }
  
  // Create user
  async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { name, email, password, role: newUserRole, tenant_id, status } = req.body;
      const currentRole = req.user.role;
      const currentTenantId = req.user.tenantId;
      
      // Validation
      if (!name || !email || !password || !newUserRole) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, password, and role are required'
        });
      }
      
      // Role-based permission checks
      if (currentRole === 'tenant_admin') {
        // Tenant admin cannot create super_admin
        if (newUserRole === 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Tenant administrators cannot create super administrators'
          });
        }
        
        // Tenant admin can only create users in their own tenant
        if (tenant_id && tenant_id !== currentTenantId) {
          return res.status(403).json({
            success: false,
            error: 'You can only create users in your own tenant'
          });
        }
      }
      
      // Determine tenant ID
      let userTenantId;
      if (currentRole === 'super_admin') {
        // Super admin creating users
        if (newUserRole === 'super_admin') {
          // Super admins don't need a tenant
          userTenantId = null;
        } else {
          // Non-super admin users need a tenant
          if (!tenant_id) {
            return res.status(400).json({
              success: false,
              error: 'Tenant selection is required for this role'
            });
          }
          userTenantId = tenant_id;
        }
      } else {
        // Tenant admin always assigns their own tenant
        userTenantId = currentTenantId;
      }
      
      // Check if email already exists
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, tenant_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, name, email, role, tenant_id, status, created_at`,
        [name, email, hashedPassword, newUserRole, userTenantId, status || 'active']
      );
      
      res.json({
        success: true,
        message: 'User created successfully',
        user: result.rows[0]
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        message: error.message
      });
    }
  }
  
  // Update user
  async update(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { name, email, password, role: newUserRole, status } = req.body;
      const currentRole = req.user.role;
      const currentTenantId = req.user.tenantId;
      
      // Validation
      if (!name || !email || !newUserRole) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, and role are required'
        });
      }
      
      // Get existing user to check permissions
      let checkQuery: string;
      let checkParams: any[];
      
      if (currentRole === 'super_admin') {
        checkQuery = 'SELECT * FROM users WHERE id = $1';
        checkParams = [id];
      } else {
        checkQuery = 'SELECT * FROM users WHERE id = $1 AND tenant_id = $2';
        checkParams = [id, currentTenantId];
      }
      
      const existingUser = await pool.query(checkQuery, checkParams);
      
      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found or access denied'
        });
      }
      
      // Role-based permission checks
      if (currentRole === 'tenant_admin') {
        // Tenant admin cannot edit super_admin or change role to super_admin
        if (existingUser.rows[0].role === 'super_admin' || newUserRole === 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Tenant administrators cannot manage super administrators'
          });
        }
      }
      
      // Build update query
      let updateQuery = 'UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = NOW()';
      let updateParams: any[] = [name, email, newUserRole, status || 'active'];
      let paramCount = 4;
      
      // Add password if provided
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        paramCount++;
        updateQuery += `, password_hash = $${paramCount}`;
        updateParams.push(hashedPassword);
      }
      
      paramCount++;
      updateQuery += ` WHERE id = $${paramCount}`;
      updateParams.push(id);
      
      // Add tenant check for tenant_admin
      if (currentRole === 'tenant_admin') {
        paramCount++;
        updateQuery += ` AND tenant_id = $${paramCount}`;
        updateParams.push(currentTenantId);
      }
      
      updateQuery += ' RETURNING id, name, email, role, tenant_id, status, updated_at';
      
      const result = await pool.query(updateQuery, updateParams);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found or access denied'
        });
      }
      
      res.json({
        success: true,
        message: 'User updated successfully',
        user: result.rows[0]
      });
    } catch (error: any) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        message: error.message
      });
    }
  }
  
  // Delete/deactivate user
  async delete(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const currentRole = req.user.role;
      const currentTenantId = req.user.tenantId;
      const currentUserId = req.user.userId;
      
      // Cannot delete self
      if (id === currentUserId) {
        return res.status(400).json({
          success: false,
          error: 'You cannot delete your own account'
        });
      }
      
      // Get user to check permissions
      let checkQuery: string;
      let checkParams: any[];
      
      if (currentRole === 'super_admin') {
        checkQuery = 'SELECT * FROM users WHERE id = $1';
        checkParams = [id];
      } else {
        checkQuery = 'SELECT * FROM users WHERE id = $1 AND tenant_id = $2';
        checkParams = [id, currentTenantId];
      }
      
      const existingUser = await pool.query(checkQuery, checkParams);
      
      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found or access denied'
        });
      }
      
      // Tenant admin cannot delete super_admin
      if (currentRole === 'tenant_admin' && existingUser.rows[0].role === 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Tenant administrators cannot delete super administrators'
        });
      }
      
      // Deactivate user instead of hard delete
      let updateQuery = 'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2';
      let updateParams: any[] = ['inactive', id];
      
      if (currentRole === 'tenant_admin') {
        updateQuery += ' AND tenant_id = $3';
        updateParams.push(currentTenantId);
      }
      
      updateQuery += ' RETURNING *';
      
      const result = await pool.query(updateQuery, updateParams);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found or access denied'
        });
      }
      
      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error: any) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        message: error.message
      });
    }
  }
}

export default new UserController();