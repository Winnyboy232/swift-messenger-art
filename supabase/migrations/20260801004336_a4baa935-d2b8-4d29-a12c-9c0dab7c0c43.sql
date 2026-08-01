
REVOKE ALL ON FUNCTION public.process_freeze_appeals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_spam_immune(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_my_freeze_appeal()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN public.process_freeze_appeals(uid);
END;
$$;

REVOKE ALL ON FUNCTION public.process_my_freeze_appeal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_my_freeze_appeal() TO authenticated;
