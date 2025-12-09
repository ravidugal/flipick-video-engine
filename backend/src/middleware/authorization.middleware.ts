import { Request, Response, NextFunction } from 'express';

type Role = 'super_admin' | 'tenant_admin' | 'tenant_user';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
    
    next();
  };
};

export const requireSuperAdmin = requireRole('super_admin');

export const requireAdmin = requireRole('super_admin', 'tenant_admin');

export const requireTenantAccess = (tenantIdParam: string = 'tenantId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    const requestedTenantId = 
      req.params[tenantIdParam] || 
      req.body.tenantId || 
      req.query.tenantId;
    
    if (!requestedTenantId) {
      return next();
    }
    
    if (req.user.tenantId !== requestedTenantId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this tenant'
      });
    }
    
    next();
  };
};

export const canManageUsers = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  if (req.user.role === 'tenant_admin') {
    const requestedTenantId = 
      req.params.tenantId || 
      req.body.tenantId || 
      req.query.tenantId;
    
    if (!requestedTenantId || requestedTenantId === req.user.tenantId) {
      return next();
    }
  }
  
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'You do not have permission to manage users'
  });
};

export default {
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireTenantAccess,
  canManageUsers
};
