-- Create enum type if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'initial_payment_status_enum') THEN
        CREATE TYPE public.initial_payment_status_enum AS ENUM ('unpaid', 'pending', 'paid');
    END IF;
END $$;

-- Add is_approved column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_approved') THEN
        ALTER TABLE public.profiles ADD COLUMN is_approved BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
END $$;

-- Add initial_payment_status column if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'initial_payment_status') THEN
        ALTER TABLE public.profiles ADD COLUMN initial_payment_status public.initial_payment_status_enum DEFAULT 'unpaid'::public.initial_payment_status_enum NOT NULL;
    END IF;
END $$;

-- Update existing profiles to set default values for newly added columns if they were NULL
UPDATE public.profiles
SET
    is_approved = FALSE,
    initial_payment_status = 'unpaid'
WHERE
    is_approved IS NULL OR initial_payment_status IS NULL;

-- Update the handle_new_user function to include the new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, phone, is_approved, initial_payment_status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    FALSE, -- Default to not approved
    'unpaid'::public.initial_payment_status_enum -- Default to unpaid
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;