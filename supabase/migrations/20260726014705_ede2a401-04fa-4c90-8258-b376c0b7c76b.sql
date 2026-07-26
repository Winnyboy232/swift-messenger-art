
REVOKE EXECUTE ON FUNCTION public.handle_spam_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_message_safety() FROM PUBLIC, anon, authenticated;
