-- Create admin user manually
-- This migration creates the admin user with email admin@aasp.app.br and password admin123

-- Note: This requires the pgcrypto extension for password hashing
-- But since we can't create auth users directly, we'll use a different approach

-- We'll create a function that can be called to create the admin user
-- This should be run after the application is deployed

CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if admin user already exists
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@aasp.app.br';

    -- If admin user doesn't exist, this function can't create it
    -- The user will be created through the application login flow
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user does not exist. Please login with admin@aasp.app.br / admin123 to create it.';
        RETURN;
    END IF;

    -- Ensure admin role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure admin profile exists
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (admin_user_id, 'Administrador', '')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Admin user setup completed.';
END;
$$;

-- Call the function
SELECT create_admin_user();
