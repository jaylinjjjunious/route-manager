-- Activity log for Admin portal visibility. Shared timeline across features.
-- Stores important application events for remote admin review.
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  action TEXT NOT NULL,
  related_record_type TEXT,
  related_record_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_activity_log_owner_created ON public.activity_log (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_feature_created ON public.activity_log (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_related ON public.activity_log (related_record_type, related_record_id);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_log FROM anon;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

-- Owners can only see their own activity
DROP POLICY IF EXISTS activity_log_owner_select ON public.activity_log;
CREATE POLICY activity_log_owner_select ON public.activity_log
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Owners can insert their own activity
DROP POLICY IF EXISTS activity_log_owner_insert ON public.activity_log;
CREATE POLICY activity_log_owner_insert ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

-- Admins (service role) can see all activity; RLS policies above restrict authenticated users
-- Admin API will use service role key for full access

COMMENT ON TABLE public.activity_log IS
  'Central activity timeline for Admin portal. Feature-specific records remain in their own tables.';