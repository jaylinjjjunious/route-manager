CREATE TABLE IF NOT EXISTS blueai_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  source_app TEXT NOT NULL DEFAULT 'barrister',
  external_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('assigned', 'available')),
  title TEXT NOT NULL,
  city TEXT,
  pay_raw TEXT,
  schedule_raw TEXT,
  status_raw TEXT,
  description_raw TEXT,
  source_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revision INTEGER NOT NULL DEFAULT 1,
  UNIQUE (owner_id, source_app, external_id)
);

CREATE INDEX IF NOT EXISTS idx_blueai_owner_category
  ON blueai_records (owner_id, category);

ALTER TABLE blueai_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON blueai_records
  FOR SELECT USING (owner_id = auth.uid());

-- RPC function for atomic snapshot replacement
-- Replaces the entire snapshot for an owner/source_app in a single transaction
-- SECURITY DEFINER with explicit search_path; only service_role can execute
CREATE OR REPLACE FUNCTION blueai_replace_snapshot(
  p_owner_id UUID,
  p_source_app TEXT,
  p_records JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record JSONB;
  v_external_ids TEXT[] := ARRAY[]::TEXT[];
  v_upserted INTEGER := 0;
  v_deleted INTEGER := 0;
BEGIN
  -- Extract external_ids from input records
  IF p_records IS NOT NULL AND jsonb_typeof(p_records) = 'array' THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
      v_external_ids := v_external_ids || (v_record->>'external_id')::TEXT;
    END LOOP;
  END IF;

  -- Upsert all records in the snapshot
  WITH input_records AS (
    SELECT 
      (elem->>'external_id')::TEXT AS external_id,
      elem->>'category' AS category,
      elem->>'title' AS title,
      elem->>'city' AS city,
      elem->>'pay_raw' AS pay_raw,
      elem->>'schedule_raw' AS schedule_raw,
      elem->>'status_raw' AS status_raw,
      elem->>'description_raw' AS description_raw,
      elem->'source_payload' AS source_payload
    FROM jsonb_array_elements(p_records) AS elem
  ),
  upserted AS (
    INSERT INTO blueai_records (owner_id, source_app, external_id, category, title, city, pay_raw, schedule_raw, status_raw, description_raw, source_payload, received_at, updated_at, revision)
    SELECT 
      p_owner_id,
      p_source_app,
      ir.external_id,
      ir.category,
      ir.title,
      ir.city,
      ir.pay_raw,
      ir.schedule_raw,
      ir.status_raw,
      ir.description_raw,
      ir.source_payload,
      now(),
      now(),
      COALESCE(br.revision, 0) + 1
    FROM input_records ir
    LEFT JOIN blueai_records br
      ON br.owner_id = p_owner_id
      AND br.source_app = p_source_app
      AND br.external_id = ir.external_id
    ON CONFLICT (owner_id, source_app, external_id) DO UPDATE SET
      category = EXCLUDED.category,
      title = EXCLUDED.title,
      city = EXCLUDED.city,
      pay_raw = EXCLUDED.pay_raw,
      schedule_raw = EXCLUDED.schedule_raw,
      status_raw = EXCLUDED.status_raw,
      description_raw = EXCLUDED.description_raw,
      source_payload = EXCLUDED.source_payload,
      updated_at = now(),
      revision = blueai_records.revision + 1
    RETURNING external_id
  )
  SELECT COUNT(*) INTO v_upserted FROM upserted;

  -- Delete records for this owner/source that are not in the new snapshot
  -- (if v_external_ids is empty, delete all for this owner/source)
  IF array_length(v_external_ids, 1) > 0 THEN
    DELETE FROM blueai_records
    WHERE owner_id = p_owner_id
      AND source_app = p_source_app
      AND external_id NOT IN (SELECT unnest(v_external_ids));
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  ELSE
    DELETE FROM blueai_records
    WHERE owner_id = p_owner_id
      AND source_app = p_source_app;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('upserted', v_upserted, 'deleted', v_deleted);
END;
$$;

-- Lock down function execution: only service_role may call it
REVOKE ALL ON FUNCTION blueai_replace_snapshot(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION blueai_replace_snapshot(UUID, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION blueai_replace_snapshot(UUID, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION blueai_replace_snapshot(UUID, TEXT, JSONB) TO service_role;