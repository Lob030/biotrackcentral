
REVOKE EXECUTE ON FUNCTION public.user_owns_workspace(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_species_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_species_profile(uuid) TO authenticated;
