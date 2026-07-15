/*
# Owner trust gap fix + auto-derive tables/waittime + enable realtime

1. Owner trust gap
   - Modified `handle_new_user` to ALWAYS set role='customer' on signup,
     ignoring any client-sent role in raw_user_meta_data.
   - New `owner_requests` table for partner applications.

2. Auto-derive available_tables
   - Trigger on reservations INSERT/UPDATE/DELETE that recalculates
     cafe.available_tables = total_tables - count(pending+confirmed
     reservations for today's date).

3. Auto-derive current_wait_minutes
   - Trigger on queue_entries INSERT/UPDATE/DELETE that recalculates
     cafe.current_wait_minutes = count(waiting entries) * 5 minutes.

4. Enable Supabase Realtime
   - Added cafes, queue_entries, reservations, orders, menu_items
     to the supabase_realtime publication.
*/

-- ============================================================
-- 1. Fix handle_new_user: always 'customer'
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. owner_requests table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.owner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_name text NOT NULL,
  area text NOT NULL,
  description text,
  contact_email text NOT NULL,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.owner_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_owner_requests" ON public.owner_requests;
CREATE POLICY "select_own_owner_requests" ON public.owner_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_owner_requests" ON public.owner_requests;
CREATE POLICY "insert_own_owner_requests" ON public.owner_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_owner_requests" ON public.owner_requests;
CREATE POLICY "update_own_owner_requests" ON public.owner_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Auto-derive available_tables from reservations
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_available_tables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

DROP TRIGGER IF EXISTS trg_recalc_available_tables ON reservations;
CREATE TRIGGER trg_recalc_available_tables
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW EXECUTE FUNCTION public.recalc_available_tables();

-- ============================================================
-- 4. Auto-derive current_wait_minutes from queue
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_wait_minutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

DROP TRIGGER IF EXISTS trg_recalc_wait_minutes ON queue_entries;
CREATE TRIGGER trg_recalc_wait_minutes
  AFTER INSERT OR UPDATE OR DELETE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.recalc_wait_minutes();

-- ============================================================
-- 5. Enable Realtime (idempotent via DO block)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cafes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cafes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'queue_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'owner_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_requests;
  END IF;
END;
$$;
