-- Add logo_url column to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create public bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
DROP POLICY IF EXISTS "Public read org-logos" ON storage.objects;
CREATE POLICY "Public read org-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

-- Admins of the org can upload (folder name = organization_id)
DROP POLICY IF EXISTS "Admins upload org-logos" ON storage.objects;
CREATE POLICY "Admins upload org-logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
);

DROP POLICY IF EXISTS "Admins update org-logos" ON storage.objects;
CREATE POLICY "Admins update org-logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
);

DROP POLICY IF EXISTS "Admins delete org-logos" ON storage.objects;
CREATE POLICY "Admins delete org-logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
);