import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'flipick-video-studio-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: 'super_admin' | 'tenant_admin' | 'tenant_user';
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('❌ JWT verification failed:', error);
    return null;
  }
};

export const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

export default {
  generateToken,
  verifyToken,
  extractToken
};
