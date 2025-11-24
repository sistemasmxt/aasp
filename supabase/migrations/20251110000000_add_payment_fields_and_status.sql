-- Add is_approved and initial_payment_status to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN initial_payment_status TEXT DEFAULT 'unpaid'; -- 'unpaid', 'pending', 'paid'

-- Add payment_type and description to payments table
ALTER TABLE public.payments
ADD COLUMN payment_type TEXT DEFAULT 'recurring', -- 'initial', 'recurring'
ADD COLUMN description TEXT;

-- Update RLS for profiles to allow users to see their own approval status
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- New policy for admins to update is_approved and initial_payment_status
CREATE POLICY "Admins can update user approval and initial payment status"
ON public.profiles
FOR UPDATE
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Update RLS for payments to allow users to see their own payments
DROP POLICY IF EXISTS "Users can view their own payments." ON public.payments;
CREATE POLICY "Users can view their own payments."
ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- New policy for admins to manage all payments
CREATE POLICY "Admins can manage all payments"
ON public.payments
FOR ALL
USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Update the app_role enum if it doesn't exist or needs modification
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

-- Update the initial_payment_status enum if it doesn't exist or needs modification
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'initial_payment_status_enum') THEN
        CREATE TYPE public.initial_payment_status_enum AS ENUM ('unpaid', 'pending', 'paid');
    END IF;
END $$;

-- Alter column type to use the new enum
ALTER TABLE public.profiles
ALTER COLUMN initial_payment_status TYPE public.initial_payment_status_enum
USING initial_payment_status::public.initial_payment_status_enum;

-- Update the payment_type enum if it doesn't exist or needs modification
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type_enum') THEN
        CREATE TYPE public.payment_type_enum AS ENUM ('initial', 'recurring');
    END IF;
END $$;

-- Alter column type to use the new enum
ALTER TABLE public.payments
ALTER COLUMN payment_type TYPE public.payment_type_enum
USING payment_type::public.payment_type_enum;

-- Add a trigger to create an initial payment record when a new profile is created
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.payments (user_id, amount, due_date, status, payment_type, description)
  VALUES (NEW.id, 132.00, (NOW() + INTERVAL '7 days')::date, 'pending', 'initial', 'Adesão inicial');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists to recreate
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();