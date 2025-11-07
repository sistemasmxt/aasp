-- Create admin user and assign admin role
-- This migration ensures the admin user exists with proper role

-- First, try to find if admin user exists
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if admin user exists
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@aasp.app.br';

    -- If admin user doesn't exist, create it
    IF admin_user_id IS NULL THEN
        -- Note: We can't create auth.users directly in migration
        -- This will be handled by the application login logic
        RAISE NOTICE 'Admin user will be created on first login';
    ELSE
        -- Admin user exists, ensure they have admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- Ensure admin profile exists
        INSERT INTO public.profiles (id, full_name, phone)
        VALUES (admin_user_id, 'Administrador', '')
        ON CONFLICT (id) DO NOTHING;

        RAISE NOTICE 'Admin user role and profile ensured';
    END IF;
END $$;
