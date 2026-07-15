/*
# Switch join_queue from SECURITY DEFINER to SECURITY INVOKER

1. Purpose
   The join_queue function was SECURITY DEFINER, meaning it ran with the
   table owner's privileges — bypassing RLS. Since the function already
   validates auth.uid() = p_user_id internally, and the underlying
   SELECT (to compute max position) and INSERT are both permitted by
   existing RLS policies for the calling user, we can safely switch to
   SECURITY INVOKER. The function will now run as the caller, subject
   to normal RLS checks.

2. Security
   - The auth.uid() check inside the function remains the security boundary
     preventing impersonation.
   - SELECT on queue_entries is allowed by the select policy (entry owner
     OR cafe owner).
   - INSERT on queue_entries is allowed by the insert policy (auth.uid()
     = user_id).
   - No elevated privileges are needed for this function.

3. Important notes
   - Idempotent: uses CREATE OR REPLACE.
   - EXECUTE remains granted to authenticated only (revoked from anon/public
     in the previous migration).
*/

CREATE OR REPLACE FUNCTION public.join_queue(
  p_cafe_id uuid,
  p_user_id uuid,
  p_customer_name text,
  p_phone text,
  p_party_size int,
  p_is_student boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_next_position int;
  v_existing uuid;
  v_inserted record;
  v_result jsonb;
BEGIN
  -- Prevent impersonation
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Check for existing waiting entry by same user for same cafe
  SELECT id INTO v_existing
  FROM queue_entries
  WHERE cafe_id = p_cafe_id
    AND user_id = p_user_id
    AND status = 'waiting';

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already_in_queue');
  END IF;

  -- Atomically compute next position
  SELECT COALESCE(max(position), 0) + 1 INTO v_next_position
  FROM queue_entries
  WHERE cafe_id = p_cafe_id
    AND status IN ('waiting', 'called');

  -- Insert the new entry
  INSERT INTO queue_entries (cafe_id, user_id, customer_name, phone, party_size, position, is_student, status)
  VALUES (p_cafe_id, p_user_id, p_customer_name, p_phone, p_party_size, v_next_position, p_is_student, 'waiting')
  RETURNING * INTO v_inserted;

  v_result := jsonb_build_object('data', to_jsonb(v_inserted));
  RETURN v_result;
END;
$$;

-- Ensure only authenticated can execute (reaffirm from previous migration)
REVOKE EXECUTE ON FUNCTION public.join_queue(uuid, uuid, text, text, int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_queue(uuid, uuid, text, text, int, boolean) TO authenticated;
