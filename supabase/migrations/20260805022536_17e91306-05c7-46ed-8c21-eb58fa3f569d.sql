ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enforce_phone_account_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing integer;
BEGIN
  IF NEW.phone IS NULL OR btrim(NEW.phone) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.phone,'') = COALESCE(NEW.phone,'') THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO existing
    FROM public.profiles p
   WHERE p.phone = NEW.phone AND p.id <> NEW.id;
  IF existing >= 3 THEN
    RAISE EXCEPTION 'PHONE_ACCOUNT_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_phone_account_limit ON public.profiles;
CREATE TRIGGER trg_phone_account_limit
BEFORE INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_phone_account_limit();

CREATE OR REPLACE FUNCTION public.phone_account_slots(_phone text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles p
   WHERE p.phone = _phone AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
$$;

GRANT EXECUTE ON FUNCTION public.phone_account_slots(text) TO authenticated;