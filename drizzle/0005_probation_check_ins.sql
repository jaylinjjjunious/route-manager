-- Supabase/Postgres migration. Apply before enabling account-backed check-in APIs.
-- No existing browser records are imported or changed by this migration.
CREATE TABLE IF NOT EXISTS public.probation_check_ins (
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL CHECK (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  device TEXT NOT NULL CHECK (device IN ('phone', 'tablet', 'computer')),
  verification_level TEXT CHECK (verification_level IN ('self_confirmed', 'screenshot_documented', 'provider_verified')),
  proof_name TEXT CHECK (octet_length(proof_name) <= 1024),
  proof_data_url TEXT CHECK (octet_length(proof_data_url) <= 2000000),
  provider_receipt_id TEXT,
  confirmation_url TEXT,
  confirmation_message_id TEXT,
  events JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(events) = 'array' AND jsonb_array_length(events) <= 1000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, month_key)
);

ALTER TABLE public.probation_check_ins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.probation_check_ins FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.probation_check_ins TO authenticated;
GRANT ALL ON public.probation_check_ins TO service_role;

DROP POLICY IF EXISTS probation_owner_select ON public.probation_check_ins;
CREATE POLICY probation_owner_select ON public.probation_check_ins
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS probation_owner_insert ON public.probation_check_ins;
CREATE POLICY probation_owner_insert ON public.probation_check_ins
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS probation_owner_update ON public.probation_check_ins;
CREATE POLICY probation_owner_update ON public.probation_check_ins
  FOR UPDATE TO authenticated USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

COMMENT ON TABLE public.probation_check_ins IS
  'Account-scoped internal check-in evidence; self-confirmation is not provider verification.';
