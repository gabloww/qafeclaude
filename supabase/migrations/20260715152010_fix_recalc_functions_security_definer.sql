/*
# Fix: recalc trigger functions must be SECURITY DEFINER

The recalc_available_tables and recalc_wait_minutes functions both
UPDATE cafes SET ..., but were marked SECURITY INVOKER. When a customer
joins a queue or books a reservation (the normal trigger path), the
function runs under the customer's RLS context. The cafes UPDATE
policy only allows auth.uid() = owner_id, so the UPDATE silently
affects 0 rows — available_tables and current_wait_minutes stay stale.

Changing both to SECURITY DEFINER lets the recalculation run with
elevated rights regardless of who triggered it. SET search_path = public
is already present on both functions (unchanged).
*/

CREATE OR REPLACE FUNCTION public.recalc_available_tables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cafe_id uuid;
  v_total_tables int;
  v_active_count int;
BEGIN
  v_cafe_id := COALESCE(NEW.cafe_id, OLD.cafe_id);
  IF v_cafe_id IS NULL THEN RETURN NULL; END IF;

  SELECT total_tables INTO v_total_tables FROM cafes WHERE id = v_cafe_id;
  IF v_total_tables IS NULL THEN RETURN NULL; END IF;

  SELECT count(*) INTO v_active_count
  FROM reservations
  WHERE cafe_id = v_cafe_id
    AND reservation_date = CURRENT_DATE
    AND status IN ('pending', 'confirmed');

  UPDATE cafes SET available_tables = GREATEST(v_total_tables - v_active_count, 0)
  WHERE id = v_cafe_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_wait_minutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cafe_id uuid;
  v_waiting_count int;
BEGIN
  v_cafe_id := COALESCE(NEW.cafe_id, OLD.cafe_id);
  IF v_cafe_id IS NULL THEN RETURN NULL; END IF;

  SELECT count(*) INTO v_waiting_count
  FROM queue_entries
  WHERE cafe_id = v_cafe_id
    AND status = 'waiting';

  UPDATE cafes SET current_wait_minutes = v_waiting_count * 5
  WHERE id = v_cafe_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
