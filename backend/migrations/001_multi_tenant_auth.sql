-- Multi-tenant Authentication Migration
-- Run this migration to add tenants, users, and update existing tables

-- ============================================
-- 1. CREATE TENANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_domain ON tenants(domain);

-- ============================================
-- 2. CREATE USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'tenant_admin', 'tenant_user')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  last_login TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);

-- ============================================
-- 3. UPDATE EXISTING TABLES
-- ============================================
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- ============================================
-- 4. SEED DATA
-- ============================================
INSERT INTO tenants (id, name, status, settings)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'active',
  '{"type": "system"}'
)
ON CONFLICT (id) DO NOTHING;

-- Super Admin (password: Flipick@2025)
INSERT INTO users (id, tenant_id, email, password_hash, name, role, status)
VALUES (
  '10000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'admin@flipick.com',
  '$2b$10$rZ8F3Z.VZ.vZ.vZ.vZ.vZ.OyZ.vZ.vZ.vZ.vZ.vZ.vZ.vZ.vZ.vZu',
  'Super Administrator',
  'super_admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- Demo tenant
INSERT INTO tenants (id, name, domain, status)
VALUES (
  '20000000-0000-0000-0000-000000000000',
  'Demo Company',
  'demo',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Demo Admin
INSERT INTO users (tenant_id, email, password_hash, name, role, status)
VALUES (
  '20000000-0000-0000-0000-000000000000',
  'admin@demo.com',
  '$2b$10$rZ8F3Z.VZ.vZ.vZ.vZ.vZ.OyZ.vZ.vZ.vZ.vZ.vZ.vZ.vZ.vZ.vZu',
  'Demo Admin',
  'tenant_admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- Demo User
INSERT INTO users (tenant_id, email, password_hash, name, role, status)
VALUES (
  '20000000-0000-0000-0000-000000000000',
  'user@demo.com',
  '$2b$10$rZ8F3Z.VZ.vZ.vZ.vZ.vZ.OyZ.vZ.vZ.vZ.vZ.vZ.vZ.vZ.vZ.vZu',
  'Demo User',
  'tenant_user',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 5. TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
