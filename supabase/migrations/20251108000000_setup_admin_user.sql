-- Migração para configurar usuário admin inicial
-- Execute apenas uma vez no painel do Supabase

-- Criar usuário admin se não existir
INSERT INTO auth.users (
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    raw_app_meta_data
) VALUES (
    gen_random_uuid(),
    'admin@aasp.app.br',
    NOW(),
    NOW(),
    NOW(),
    '{"full_name": "Administrador"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Adicionar role admin para o usuário
INSERT INTO user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE u.email = 'admin@aasp.app.br'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'admin'
);

-- Criar perfil se não existir
INSERT INTO profiles (id, email, full_name, phone, created_at, updated_at)
SELECT u.id, u.email, 'Administrador', '', NOW(), NOW()
FROM auth.users u
WHERE u.email = 'admin@aasp.app.br'
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
