-- Apply after 0005 and 0006. Records and their audit event commit together.
ALTER TABLE public.probation_check_ins ADD COLUMN IF NOT EXISTS client_updated_at TIMESTAMPTZ;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS activity_log_owner_idempotency
  ON public.activity_log(owner_id, idempotency_key);
-- All writes go through the authenticated server, including audit writes.
REVOKE INSERT, UPDATE, DELETE ON public.probation_check_ins FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.activity_log FROM authenticated;
DROP POLICY IF EXISTS probation_owner_insert ON public.probation_check_ins;
DROP POLICY IF EXISTS probation_owner_update ON public.probation_check_ins;
DROP POLICY IF EXISTS activity_log_owner_insert ON public.activity_log;

CREATE OR REPLACE FUNCTION public.save_probation_with_activity(
  p_owner_id UUID, p_month_key TEXT, p_record JSONB, p_idempotency_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  old_record public.probation_check_ins%ROWTYPE;
  saved public.probation_check_ins%ROWTYPE;
  merged_events JSONB;
  old_proof_at TIMESTAMPTZ;
  new_proof_at TIMESTAMPTZ;
  replace_proof BOOLEAN;
  incoming_updated TIMESTAMPTZ;
BEGIN
  IF p_owner_id IS NULL OR p_month_key IS NULL OR p_month_key !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    OR p_record->>'device' IS NULL OR p_record->>'device' NOT IN ('phone','tablet','computer')
    OR p_record->>'verificationLevel' = 'provider_verified'
    OR jsonb_typeof(p_record->'events') IS DISTINCT FROM 'array'
    OR p_idempotency_key IS NULL OR length(p_idempotency_key) <> 64
  THEN RAISE EXCEPTION 'Invalid check-in request'; END IF;

  -- Serializes even the first insert for a given owner/month.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner_id::TEXT || ':' || p_month_key, 0));
  SELECT * INTO old_record FROM public.probation_check_ins
    WHERE owner_id=p_owner_id AND month_key=p_month_key FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.activity_log WHERE owner_id=p_owner_id AND idempotency_key=p_idempotency_key) THEN
    RETURN to_jsonb(old_record);
  END IF;

  SELECT coalesce(jsonb_agg(e ORDER BY e->>'at'), '[]'::JSONB) INTO merged_events
    FROM (SELECT DISTINCT e FROM jsonb_array_elements(coalesce(old_record.events,'[]'::JSONB) || (p_record->'events')) e) unique_events;
  IF jsonb_array_length(merged_events) > 1000 THEN RAISE EXCEPTION 'Check-in event capacity reached'; END IF;
  SELECT max((e->>'at')::TIMESTAMPTZ) INTO old_proof_at
    FROM jsonb_array_elements(coalesce(old_record.events,'[]'::JSONB)) e WHERE e->>'type'='proof_attached';
  SELECT max((e->>'at')::TIMESTAMPTZ) INTO new_proof_at
    FROM jsonb_array_elements(p_record->'events') e WHERE e->>'type'='proof_attached';
  replace_proof := nullif(p_record->>'proofDataUrl','') IS NOT NULL AND
    (old_record.proof_data_url IS NULL OR coalesce(new_proof_at,'-infinity'::TIMESTAMPTZ) >= coalesce(old_proof_at,'-infinity'::TIMESTAMPTZ));
  incoming_updated := (p_record->>'clientUpdatedAt')::TIMESTAMPTZ;

  INSERT INTO public.probation_check_ins AS target
    (owner_id,month_key,started_at,completed_at,device,verification_level,proof_name,proof_data_url,
     provider_receipt_id,confirmation_url,confirmation_message_id,events,client_updated_at,updated_at)
  VALUES (
    p_owner_id,p_month_key,
    coalesce(old_record.started_at,(p_record->>'startedAt')::TIMESTAMPTZ),
    coalesce(old_record.completed_at,(p_record->>'completedAt')::TIMESTAMPTZ),
    CASE WHEN old_record.client_updated_at > incoming_updated THEN old_record.device ELSE p_record->>'device' END,
    CASE WHEN old_record.verification_level='provider_verified' THEN 'provider_verified'
      WHEN coalesce(old_record.completed_at,(p_record->>'completedAt')::TIMESTAMPTZ) IS NULL THEN NULL
      WHEN replace_proof OR old_record.proof_data_url IS NOT NULL THEN 'screenshot_documented' ELSE 'self_confirmed' END,
    CASE WHEN replace_proof THEN p_record->>'proofName' ELSE old_record.proof_name END,
    CASE WHEN replace_proof THEN p_record->>'proofDataUrl' ELSE old_record.proof_data_url END,
    coalesce(old_record.provider_receipt_id,p_record->>'providerReceiptId'),
    coalesce(old_record.confirmation_url,p_record->>'confirmationUrl'),
    coalesce(old_record.confirmation_message_id,p_record->>'confirmationMessageId'),
    merged_events,greatest(old_record.client_updated_at,incoming_updated),now()
  ) ON CONFLICT (owner_id,month_key) DO UPDATE SET
    started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at,device=EXCLUDED.device,
    verification_level=EXCLUDED.verification_level,proof_name=EXCLUDED.proof_name,proof_data_url=EXCLUDED.proof_data_url,
    provider_receipt_id=EXCLUDED.provider_receipt_id,confirmation_url=EXCLUDED.confirmation_url,
    confirmation_message_id=EXCLUDED.confirmation_message_id,events=EXCLUDED.events,
    client_updated_at=EXCLUDED.client_updated_at,updated_at=EXCLUDED.updated_at
  RETURNING * INTO saved;

  INSERT INTO public.activity_log(owner_id,feature,action,related_record_type,related_record_id,summary,metadata,idempotency_key)
  VALUES (p_owner_id,'probation',
    CASE WHEN old_record.completed_at IS NULL AND saved.completed_at IS NOT NULL THEN 'check_in_completed'
      WHEN replace_proof THEN 'proof_attached' ELSE 'check_in_saved' END,
    'probation_check_in',p_owner_id::TEXT || ':' || p_month_key,
    'Saved monthly check-in for ' || p_month_key,
    jsonb_build_object('monthKey',p_month_key,'device',saved.device,'verificationLevel',saved.verification_level,'hasProof',saved.proof_data_url IS NOT NULL),
    p_idempotency_key);
  RETURN to_jsonb(saved);
END; $$;
REVOKE ALL ON FUNCTION public.save_probation_with_activity(UUID,TEXT,JSONB,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_probation_with_activity(UUID,TEXT,JSONB,TEXT) TO service_role;
