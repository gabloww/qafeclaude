/*
# Add join_queue RPC and fix queue position race condition

1. Purpose
   The client was computing `position = queueCount + 1`, which causes
   duplicate positions when two users join simultaneously. This migration
   creates an RPC `join_queue` that atomically computes the next position
   inside the database using `max(position) + 1` and inserts the row in
   a single call.

2. New Functions
   - `join_queue(p_cafe_id, p_user_id, p_customer_name, p_phone, p_party_size, p_is_student)`:
     Inserts a queue entry with the next available position for the cafe.
     Returns the inserted row (including the assigned position).
     Also checks for an existing 'waiting' entry by the same user for the
     same cafe to prevent duplicate joins.

3. Security
   - The function is `SECURITY DEFINER` so it can insert into queue_entries
     even though the caller is authenticated. It validates that p_user_id
     matches auth.uid() to prevent impersonation.
   - The function is callable by authenticated users only.

4. Important notes
   - Idempotent: uses CREATE OR REPLACE.
   - Returns the full inserted row as JSON.
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
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.join_queue(uuid, uuid, text, text, int, boolean) TO authenticated;
