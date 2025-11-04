CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  );
END;
$$;