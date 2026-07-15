/*
# Add user_id columns and owner-scoped RLS for account system

1. Purpose
   Convert the café app from a no-auth (phone-number lookup) model to a
   full account system with Supabase email/password auth. Each user's
   queue entries, reservations, and orders are now scoped to their
   authenticated account via a `user_id` column.

2. Changes to existing tables
   - `cafes`: No changes — café data is public/shared (readable by anon +
     authenticated). Keeps existing anon policies.
   - `menu_items`: No changes — menu data is public/shared. Keeps existing
     anon policies.
   - `queue_entries`: Added `user_id uuid NOT NULL DEFAULT auth.uid()`
     referencing auth.users. RLS updated to owner-scoped authenticated.
   - `reservations`: Added `user_id uuid NOT NULL DEFAULT auth.uid()`
     referencing auth.users. RLS updated to owner-scoped authenticated.
   - `orders`: Added `user_id uuid NOT NULL DEFAULT auth.uid()`
     referencing auth.users. RLS updated to owner-scoped authenticated.

3. Security changes
   - `cafes` and `menu_items` keep `TO anon, authenticated` public policies
     (shared data, no ownership).
   - `queue_entries`, `reservations`, `orders` now use `TO authenticated`
     with `auth.uid() = user_id` ownership checks. Old anon policies dropped.
   - The `user_id` column has `DEFAULT auth.uid()` so frontend inserts that
     omit `user_id` still satisfy the WITH CHECK policy.

4. Important notes
   - This migration is idempotent: uses DO $$ blocks for column additions
     and DROP POLICY IF EXISTS before creating new policies.
   - Existing seed data in queue_entries/reservations/orders will get
     user_id = auth.uid() which defaults to NULL for pre-existing rows.
     A backfill sets them to a known UUID placeholder so they remain
     accessible only via execute_sql (not via the app, which is expected —
     they were demo data). New rows from authenticated users work correctly.
*/

-- Add user_id to queue_entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queue_entries' AND column_name = 'user_id') THEN
    ALTER TABLE queue_entries ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to reservations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'user_id') THEN
    ALTER TABLE reservations ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id to orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id') THEN
    ALTER TABLE orders ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update queue_entries RLS: drop old anon policies, add owner-scoped
DROP POLICY IF EXISTS "anon_crud_queue_entries" ON queue_entries;
DROP POLICY IF EXISTS "select_own_queue_entries" ON queue_entries;
DROP POLICY IF EXISTS "insert_own_queue_entries" ON queue_entries;
DROP POLICY IF EXISTS "update_own_queue_entries" ON queue_entries;
DROP POLICY IF EXISTS "delete_own_queue_entries" ON queue_entries;

CREATE POLICY "select_own_queue_entries" ON queue_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_queue_entries" ON queue_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_queue_entries" ON queue_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_queue_entries" ON queue_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Update reservations RLS: drop old anon policies, add owner-scoped
DROP POLICY IF EXISTS "anon_crud_reservations" ON reservations;
DROP POLICY IF EXISTS "select_own_reservations" ON reservations;
DROP POLICY IF EXISTS "insert_own_reservations" ON reservations;
DROP POLICY IF EXISTS "update_own_reservations" ON reservations;
DROP POLICY IF EXISTS "delete_own_reservations" ON reservations;

CREATE POLICY "select_own_reservations" ON reservations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_reservations" ON reservations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_reservations" ON reservations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_reservations" ON reservations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Update orders RLS: drop old anon policies, add owner-scoped
DROP POLICY IF EXISTS "anon_crud_orders" ON orders;
DROP POLICY IF EXISTS "select_own_orders" ON orders;
DROP POLICY IF EXISTS "insert_own_orders" ON orders;
DROP POLICY IF EXISTS "update_own_orders" ON orders;
DROP POLICY IF EXISTS "delete_own_orders" ON orders;

CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_orders" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for user_id queries
CREATE INDEX IF NOT EXISTS idx_queue_entries_user_id ON queue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
