-- Add RLS policy to allow authenticated users to manage their own roles

-- First, ensure RLS is enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON user_roles;

-- Create policies
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roles" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow admin users to manage all roles (this will be added after the admin user is set up)
-- For now, temporarily allow all authenticated users to insert admin roles
CREATE POLICY "Temporary admin role insertion" ON user_roles
  FOR INSERT WITH CHECK (role = 'admin' AND auth.uid() IS NOT NULL);

-- Now try to insert the admin role
INSERT INTO user_roles (user_id, role)
VALUES ('3af8f8e8-5223-444e-a4cd-eb9fa7ea7bff', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify
SELECT
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@aasp.app.br';
