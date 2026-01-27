
-- Rollback script for soft delete migration
-- WARNING: This will remove soft delete functionality and may cause data loss

-- Remove soft delete columns
ALTER TABLE users DROP COLUMN IF EXISTS is_deleted;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_by;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_is_deleted_active;
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_users_deleted_by;
DROP INDEX IF EXISTS idx_users_active_lookup;

-- Drop restore function
DROP FUNCTION IF EXISTS restore_user(uuid, text);

-- Recreate original RLS policies (if needed)
-- Note: You may need to adjust these based on your original policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Admins can soft delete users" ON users;
DROP POLICY IF EXISTS "Admins can restore users" ON users;

-- Add your original policies here
-- CREATE POLICY "Users can view their own profile" ON users FOR SELECT ...
-- CREATE POLICY "Admins can manage users" ON users FOR ALL ...

-- Remove trigger
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_users_updated_at();
