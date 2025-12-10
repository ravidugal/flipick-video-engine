import { Request, Response } from 'express';
import pool from '../config/database';
import { comparePassword, hashPassword, generateResetToken } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }
      
      const result = await pool.query(
        `SELECT u.*, t.name as tenant_name, t.status as tenant_status
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1`,
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      const user = result.rows[0];
      
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Account is inactive',
          message: 'Please contact administrator'
        });
      }
      
      if (user.role !== 'super_admin' && user.tenant_status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Tenant is inactive',
          message: 'Please contact administrator'
        });
      }
      
      const isValidPassword = await comparePassword(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );
      
      const token = generateToken({
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role
      });
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          tenantName: user.tenant_name
        }
      });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        message: error.message
      });
    }
  }
  
  async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }
      
      const result = await pool.query(
        `SELECT u.id, u.email, u.name, u.role, u.status, u.last_login,
                u.tenant_id, t.name as tenant_name, t.status as tenant_status
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.id = $1`,
        [req.user.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const user = result.rows[0];
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          lastLogin: user.last_login,
          tenantId: user.tenant_id,
          tenantName: user.tenant_name,
          tenantStatus: user.tenant_status
        }
      });
    } catch (error: any) {
      console.error('❌ Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user info',
        message: error.message
      });
    }
  }
  
  async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long'
        });
      }
      
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const isValid = await comparePassword(currentPassword, result.rows[0].password_hash);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
      
      const newHash = await hashPassword(newPassword);
      
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newHash, req.user.userId]
      );
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      console.error('❌ Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        message: error.message
      });
    }
  }
  
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }
      
      const result = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND status = $2',
        [email.toLowerCase(), 'active']
      );
      
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          message: 'If an account exists with this email, a reset token has been generated'
        });
      }
      
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 3600000);
      
      await pool.query(
        `UPDATE users 
         SET password_reset_token = $1, 
             password_reset_expires = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [resetToken, expiresAt, result.rows[0].id]
      );
      
      res.json({
        success: true,
        message: 'Password reset token generated',
        resetToken
      });
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process password reset',
        message: error.message
      });
    }
  }
  
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required'
        });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        });
      }
      
      const result = await pool.query(
        `SELECT id FROM users 
         WHERE password_reset_token = $1 
         AND password_reset_expires > NOW()
         AND status = 'active'`,
        [token]
      );
      
      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }
      
      const newHash = await hashPassword(newPassword);
      
      await pool.query(
        `UPDATE users 
         SET password_hash = $1,
             password_reset_token = NULL,
             password_reset_expires = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [newHash, result.rows[0].id]
      );
      
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
        message: error.message
      });
    }
  }
  
  async logout(req: Request, res: Response) {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}

export default new AuthController();
