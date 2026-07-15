/*
# Fix RLS policy and SECURITY DEFINER function security issues

1. Purpose
   - Fix UPDATE policies on queue_entries, reservations, orders that had
     WITH CHECK (true), allowing unrestricted row modifications.
   - Revoke EXECUTE on SECURITY DEFINER functions from anon/public roles
     to prevent unauthorized invocation via REST.

2. RLS Policy Changes
   - queue_entries: update_queue_entries WITH CHECK (true) → WITH CHECK
     (auth.uid() = user_id OR EXISTS(cafe owner check))
   - reservations: update_reservations WITH CHECK (true) → same pattern
   - orders: update_orders WITH CHECK (true) → same pattern

3. Function Permission Changes
   - handle_new_user(): Revoke EXECUTE from PUBLIC, anon, authenticated.
     This is a trigger function — only the trigger (running as the owner)
     needs to call it. No REST access needed.
   - join_queue(): Revoke EXECUTE from PUBLIC and anon. Keep EXECUTE on
     authenticated only (authenticated users join queues, not anon).

4. Important notes
   - Idempotent: uses DROP POLICY IF EXISTS before recreating.
   - Functions are kept as SECURITY DEFINER because:
     * handle_new_user inserts into profiles (which has RLS) — needs to
       run as the owner to insert the profile row for a new user.
     * join_queue inserts into queue_entries — needs to run as the owner
       to compute the next position atomically. It validates auth.uid()
       internally to prevent impersonation.
   - The auth.uid() check inside join_queue is the security boundary,
     not the function's definer role.
*/

-- Fix queue_entries UPDATE policy
DROP POLICY IF EXISTS "update_queue_entries" ON queue_entries;
CREATE POLICY "update_queue_entries" ON queue_entries FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = queue_entries.cafe_id AND cafes.owner_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = queue_entries.cafe_id AND cafes.owner_id = auth.uid())
  );

-- Fix reservations UPDATE policy
DROP POLICY IF EXISTS "update_reservations" ON reservations;
CREATE POLICY "update_reservations" ON reservations FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = reservations.cafe_id AND cafes.owner_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = reservations.cafe_id AND cafes.owner_id = auth.uid())
  );

-- Fix orders UPDATE policy
DROP POLICY IF EXISTS "update_orders" ON orders;
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = orders.cafe_id AND cafes.owner_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = orders.cafe_id AND cafes.owner_id = auth.uid())
  );

-- Revoke EXECUTE on handle_new_user from all roles except the owner
-- This is a trigger function — it should never be called via REST
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Revoke EXECUTE on join_queue from anon and public
-- Only authenticated users should be able to join queues
REVOKE EXECUTE ON FUNCTION public.join_queue(uuid, uuid, text, text, int, boolean) FROM PUBLIC, anon;
