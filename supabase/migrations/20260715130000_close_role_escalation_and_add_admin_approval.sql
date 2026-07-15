/*
# Close role self-escalation hole + add real admin approval flow

1. The problem (important — read this one)
   `update_own_profile` lets a user update their own profile row, but
   does not restrict WHICH fields they can change. That means any signed-in
   customer could open their browser console and run:
     supabase.from('profiles').update({ role: 'owner' }).eq('id', myId)
   ...and instantly become a cafe owner, completely bypassing the
   "Become a Partner" request form. This closes that door.

2. The fix
   A trigger on `profiles` blocks any UPDATE that changes `role`, UNLESS
   the update is coming from the new `approve_owner_request` function
   below (which sets a transaction-local flag to allow it). This is the
   only path that can ever promote someone to 'owner' or 'admin' now.

3. Admin approval flow
   - `owner_requests` gets a new SELECT policy so admins (profiles.role
     = 'admin') can see all pending requests, not just their own.
   - `approve_owner_request(request_id, approve, notes)` is a
     SECURITY DEFINER RPC. It checks the caller is an admin, then either
     promotes the requester to 'owner' and marks the request approved,
     or marks it rejected. Only authenticated users can call it; non-admins
     calling it just get an error back — same pattern as `join_queue`.

4. Bootstrapping your first admin
   There's intentionally no self-service way to become an admin (for the
   same reason as #1). After running this migration, go to Supabase ->
   Table Editor -> profiles, find your own row, and manually change your
   `role` to 'admin'. That's a one-time, one-person action you do by hand
   in the dashboard — not something the app exposes to anyone else.
*/

-- ============================================================
-- 1. Block client-side role changes
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('app.allow_role_change', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Role changes must go through the partner approval process';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ============================================================
-- 2. Admins can see all owner_requests, not just their own
-- ============================================================

DROP POLICY IF EXISTS "admin_select_all_owner_requests" ON public.owner_requests;
CREATE POLICY "admin_select_all_owner_requests" ON public.owner_requests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. Admin approval RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_owner_request(
  p_request_id uuid,
  p_approve boolean,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_target_user uuid;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT user_id INTO v_target_user FROM owner_requests WHERE id = p_request_id;
  IF v_target_user IS NULL THEN
    RETURN jsonb_build_object('error', 'Request not found');
  END IF;

  UPDATE owner_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      admin_notes = p_notes,
      reviewed_at = now()
  WHERE id = p_request_id;

  IF p_approve THEN
    PERFORM set_config('app.allow_role_change', 'true', true);
    UPDATE profiles SET role = 'owner' WHERE id = v_target_user;
  END IF;

  RETURN jsonb_build_object('data', jsonb_build_object('success', true));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_owner_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_owner_request(uuid, boolean, text) TO authenticated;
