-- =================================================================================================
-- ENUMS
-- =================================================================================================

-- Enum for user roles
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for initial payment status
DO $$ BEGIN
    CREATE TYPE public.initial_payment_status_enum AS ENUM ('unpaid', 'pending', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum for payment types
DO $$ BEGIN
    CREATE TYPE public.payment_type_enum AS ENUM ('initial', 'recurring');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =================================================================================================
-- TABLES
-- =================================================================================================

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text NOT NULL,
    phone text,
    address text,
    latitude numeric,
    longitude numeric,
    avatar_url text,
    is_approved boolean DEFAULT false NOT NULL,
    initial_payment_status public.initial_payment_status_enum DEFAULT 'unpaid' NOT NULL
);

-- User Roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Cameras table
CREATE TABLE IF NOT EXISTS public.cameras (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    ip_address text NOT NULL,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    neighborhood text,
    street text,
    city text,
    stream_url text,
    is_active boolean DEFAULT true NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL,
    due_date date NOT NULL,
    paid_at timestamp with time zone,
    status text DEFAULT 'pending' NOT NULL, -- Using text for status as per current code, consider enum if needed
    payment_type public.payment_type_enum DEFAULT 'recurring' NOT NULL,
    description text
);

-- Emergency Alerts table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    alert_type text NOT NULL,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    message text,
    is_active boolean DEFAULT true NOT NULL,
    resolved_at timestamp with time zone
);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL UNIQUE,
    description text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Group Members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'member' NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (group_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
    content text,
    message_type text DEFAULT 'text' NOT NULL,
    is_group boolean DEFAULT false NOT NULL,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    CONSTRAINT chk_receiver_or_group CHECK (
        (receiver_id IS NOT NULL AND group_id IS NULL) OR
        (receiver_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_size numeric
);

-- Admin Logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id text,
    details jsonb
);

-- Public Utility Contacts table
CREATE TABLE IF NOT EXISTS public.public_utility_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL UNIQUE,
    phone text NOT NULL,
    whatsapp text,
    description text,
    icon_name text NOT NULL,
    color_class text NOT NULL
);

-- =================================================================================================
-- ROW LEVEL SECURITY (RLS)
-- =================================================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_utility_contacts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END;
$$;

-- Helper function to check if a user is a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id);
END;
$$;

-- Profiles RLS
DROP POLICY IF EXISTS "Profiles: authenticated can read all" ON public.profiles;
CREATE POLICY "Profiles: authenticated can read all" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Profiles: authenticated can update own" ON public.profiles;
CREATE POLICY "Profiles: authenticated can update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: admin can manage all" ON public.profiles;
CREATE POLICY "Profiles: admin can manage all" ON public.profiles FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- User Roles RLS
DROP POLICY IF EXISTS "User Roles: authenticated can read own role" ON public.user_roles;
CREATE POLICY "User Roles: authenticated can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User Roles: admin can manage all" ON public.user_roles;
CREATE POLICY "User Roles: admin can manage all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- Cameras RLS
DROP POLICY IF EXISTS "Cameras: all authenticated can read active" ON public.cameras;
CREATE POLICY "Cameras: all authenticated can read active" ON public.cameras FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Cameras: admin can manage all" ON public.cameras;
CREATE POLICY "Cameras: admin can manage all" ON public.cameras FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- Payments RLS
DROP POLICY IF EXISTS "Payments: authenticated can read own" ON public.payments;
CREATE POLICY "Payments: authenticated can read own" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Payments: admin can manage all" ON public.payments;
CREATE POLICY "Payments: admin can manage all" ON public.payments FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- Emergency Alerts RLS
DROP POLICY IF EXISTS "Emergency Alerts: authenticated can read all" ON public.emergency_alerts;
CREATE POLICY "Emergency Alerts: authenticated can read all" ON public.emergency_alerts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Emergency Alerts: authenticated can insert own" ON public.emergency_alerts;
CREATE POLICY "Emergency Alerts: authenticated can insert own" ON public.emergency_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Emergency Alerts: authenticated can update own (resolve)" ON public.emergency_alerts;
CREATE POLICY "Emergency Alerts: authenticated can update own (resolve)" ON public.emergency_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Emergency Alerts: admin can manage all" ON public.emergency_alerts;
CREATE POLICY "Emergency Alerts: admin can manage all" ON public.emergency_alerts FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- Groups RLS
DROP POLICY IF EXISTS "Groups: authenticated can read if member or admin" ON public.groups;
CREATE POLICY "Groups: authenticated can read if member or admin" ON public.groups FOR SELECT TO authenticated USING (
    public.is_group_member(id, auth.uid()) OR public.has_role('admin', auth.uid())
);

DROP POLICY IF EXISTS "Groups: admin can manage all" ON public.groups;
CREATE POLICY "Groups: admin can manage all" ON public.groups FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- Group Members RLS
DROP POLICY IF EXISTS "Group Members: authenticated can read if member or admin" ON public.group_members;
CREATE POLICY "Group Members: authenticated can read if member or admin" ON public.group_members FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR public.is_group_member(group_id, auth.uid()) OR public.has_role('admin', auth.uid())
);

DROP POLICY IF EXISTS "Group Members: admin can manage all" ON public.group_members;
CREATE POLICY "Group Members: admin can manage all" ON public.group_members FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- Messages RLS
DROP POLICY IF EXISTS "Messages: authenticated can read own or group messages" ON public.messages;
CREATE POLICY "Messages: authenticated can read own or group messages" ON public.messages FOR SELECT TO authenticated USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id OR
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())) OR
    public.has_role('admin', auth.uid())
);

DROP POLICY IF EXISTS "Messages: authenticated can insert" ON public.messages;
CREATE POLICY "Messages: authenticated can insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    (
        (receiver_id IS NOT NULL AND group_id IS NULL) OR
        (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
    )
);

DROP POLICY IF EXISTS "Messages: authenticated can update delivered/read status" ON public.messages;
CREATE POLICY "Messages: authenticated can update delivered/read status" ON public.messages FOR UPDATE TO authenticated USING (
    auth.uid() = receiver_id OR public.has_role('admin', auth.uid())
);

DROP POLICY IF EXISTS "Messages: admin can manage all" ON public.messages;
CREATE POLICY "Messages: admin can manage all" ON public.messages FOR DELETE TO authenticated USING (public.has_role('admin', auth.uid()));

-- Attachments RLS
DROP POLICY IF EXISTS "Attachments: authenticated can read if message accessible" ON public.attachments;
CREATE POLICY "Attachments: authenticated can read if message accessible" ON public.attachments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.messages WHERE id = message_id AND (auth.uid() = sender_id OR auth.uid() = receiver_id OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid())))) OR
    public.has_role('admin', auth.uid())
);

DROP POLICY IF EXISTS "Attachments: authenticated can insert" ON public.attachments;
CREATE POLICY "Attachments: authenticated can insert" ON public.attachments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.messages WHERE id = message_id AND auth.uid() = sender_id)
);

DROP POLICY IF EXISTS "Attachments: admin can manage all" ON public.attachments;
CREATE POLICY "Attachments: admin can manage all" ON public.attachments FOR ALL TO authenticated USING (public.has_role('admin', auth.uid()));

-- Admin Logs RLS
DROP POLICY IF EXISTS "Admin Logs: admin can read all" ON public.admin_logs;
CREATE POLICY "Admin Logs: admin can read all" ON public.admin_logs FOR SELECT TO authenticated USING (public.has_role('admin', auth.uid()));

DROP POLICY IF EXISTS "Admin Logs: admin can insert" ON public.admin_logs;
CREATE POLICY "Admin Logs: admin can insert" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.has_role('admin', auth.uid()));

-- Public Utility Contacts RLS
DROP POLICY IF EXISTS "Public Utility Contacts: Enable read access for all users" ON public.public_utility_contacts;
CREATE POLICY "Public Utility Contacts: Enable read access for all users" ON public.public_utility_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Utility Contacts: admin can manage all" ON public.public_utility_contacts;
CREATE POLICY "Public Utility Contacts: admin can manage all" ON public.public_utility_contacts FOR ALL TO authenticated USING (public.has_role('admin', auth.uid())) WITH CHECK (public.has_role('admin', auth.uid()));

-- =================================================================================================
-- TRIGGERS
-- =================================================================================================

-- Function to create a public.profile and public.user_roles entry on new auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'phone');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger to run handle_new_user on auth.users inserts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at column automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on relevant tables
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_cameras_updated_at ON public.cameras;
CREATE TRIGGER set_cameras_updated_at
BEFORE UPDATE ON public.cameras
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_groups_updated_at ON public.groups;
CREATE TRIGGER set_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_public_utility_contacts_updated_at ON public.public_utility_contacts;
CREATE TRIGGER set_public_utility_contacts_updated_at
BEFORE UPDATE ON public.public_utility_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =================================================================================================
-- SEED DATA (Initial Data)
-- =================================================================================================

-- Insert initial public utility contacts if they don't exist
INSERT INTO public.public_utility_contacts (name, phone, whatsapp, description, icon_name, color_class) VALUES
('Polícia Militar', '190', NULL, 'Emergência policial', 'ShieldAlert', 'text-blue-600'),
('Ambulância (SAMU)', '192', NULL, 'Emergência médica', 'Ambulance', 'text-green-600'),
('Bombeiros', '193', NULL, 'Emergência de incêndio e resgate', 'Siren', 'text-red-600'),
('Defesa Civil', '199', NULL, 'Desastres naturais e calamidades', 'Building2', 'text-orange-600'),
('Conselho Tutelar', '123456789', NULL, 'Proteção de crianças e adolescentes', 'Users', 'text-purple-600')
ON CONFLICT (name) DO NOTHING;

-- Create a default admin user if not exists
-- IMPORTANT: Change 'admin123' password immediately after creation!
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000001', -- A fixed UUID for the admin user
    'admin@aasp.app.br',
    crypt('admin123', gen_salt('bf')), -- IMPORTANT: Change 'admin123'
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrador AASP","phone":"+5548999999999"}',
    false,
    now(),
    now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@aasp.app.br');

-- Assign 'admin' role to the default admin user if not already assigned
INSERT INTO public.user_roles (user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-000000000001' AND role = 'admin');

-- Update the profile for the default admin user to be approved and paid
UPDATE public.profiles
SET is_approved = true, initial_payment_status = 'paid'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Insert an initial payment for the admin user if not exists
INSERT INTO public.payments (user_id, amount, due_date, paid_at, status, payment_type, description)
SELECT '00000000-0000-0000-0000-000000000001', 132.00, now()::date, now(), 'paid', 'initial', 'Pagamento de Adesão Inicial (Admin)'
WHERE NOT EXISTS (SELECT 1 FROM public.payments WHERE user_id = '00000000-0000-0000-0000-000000000001' AND payment_type = 'initial');

-- =================================================================================================
-- VIEWS
-- =================================================================================================

-- Public Profiles View (for general access to basic profile info)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  p.id,
  p.created_at,
  p.full_name,
  p.avatar_url
FROM public.profiles p;

-- Grant access to the public_profiles view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- =================================================================================================
-- STORAGE BUCKETS
-- =================================================================================================

-- Create 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Policy for avatars bucket: authenticated users can upload/update their own avatar
CREATE POLICY "Allow authenticated users to upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated users to update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for avatars bucket: everyone can view avatars
CREATE POLICY "Allow everyone to view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy for avatars bucket: authenticated users can delete their own avatar
CREATE POLICY "Allow authenticated users to delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for avatars bucket: admins can manage all avatars
CREATE POLICY "Allow admins to manage all avatars"
ON storage.objects FOR ALL
TO authenticated
USING (public.has_role('admin', auth.uid()))
WITH CHECK (public.has_role('admin', auth.uid()));