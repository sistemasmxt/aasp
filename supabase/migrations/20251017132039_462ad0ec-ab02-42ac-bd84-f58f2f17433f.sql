-- Safe creation of admin policies using DO blocks

-- 1) Payments admin SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Admins can view all payments'
  ) THEN
    CREATE POLICY "Admins can view all payments"
    ON public.payments
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 2) Groups admin SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'groups' AND policyname = 'Admins can view all groups'
  ) THEN
    CREATE POLICY "Admins can view all groups"
    ON public.groups
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 3) Group members admin SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'Admins can view all group memberships'
  ) THEN
    CREATE POLICY "Admins can view all group memberships"
    ON public.group_members
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 4) Profiles admin UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 5) User roles admin SELECT/INSERT/DELETE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can view all roles'
  ) THEN
    CREATE POLICY "Admins can view all roles"
    ON public.user_roles
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can insert roles'
  ) THEN
    CREATE POLICY "Admins can insert roles"
    ON public.user_roles
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can delete roles'
  ) THEN
    CREATE POLICY "Admins can delete roles"
    ON public.user_roles
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;