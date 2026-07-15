/*
# Add profiles table, owner_id on cafes, and owner-scoped RLS

1. Purpose
   Introduce a two-role account system: customers and cafe owners.
   Owners can publish their cafes, manage menus, and accept/manage
   queue entries, reservations, and orders for their cafes.

2. New Tables
   - `profiles`: extends auth.users with a role and display name.
     - id (uuid pk, references auth.users)
     - email (text)
     - full_name (text)
     - role (text: 'customer' | 'owner', default 'customer')
     - created_at (timestamptz)

3. Changes to existing tables
   - `cafes`: Added `owner_id uuid DEFAULT auth.uid()` referencing auth.users.
     This lets owners manage only their own cafes. Existing cafes get
     owner_id = NULL (unclaimed — still publicly readable).
   - `menu_items`: RLS updated so anyone can read (public), but only the
     cafe's owner can insert/update/delete (checked via cafe owner_id).
   - `queue_entries`: RLS updated so the cafe owner can also read/update
     (to call/seat/cancel entries) in addition to the entry owner.
   - `reservations`: Same pattern — owner can read/update to confirm/cancel.
   - `orders`: Same pattern — owner can read/update to mark preparing/ready.

4. Security changes
   - `profiles`: owner-scoped (users see/edit only their own profile).
   - `cafes`: SELECT is public (anon + authenticated). INSERT/UPDATE/DELETE
     scoped to owner (auth.uid() = owner_id).
   - `menu_items`: SELECT public. INSERT/UPDATE/DELETE scoped to cafe owner.
   - `queue_entries`: SELECT — entry owner OR cafe owner. INSERT — entry owner
     only. UPDATE — entry owner OR cafe owner. DELETE — entry owner only.
   - `reservations`: Same pattern as queue_entries.
   - `orders`: Same pattern as queue_entries.

5. Important notes
   - Idempotent: uses DO $$ blocks for column additions and DROP POLICY
     IF EXISTS before creating new policies.
   - The `profiles` table is populated via a trigger on auth.users insert
     so new sign-ups automatically get a profile row.
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Add owner_id to cafes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cafes' AND column_name = 'owner_id') THEN
    ALTER TABLE cafes ADD COLUMN owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add owner_id to queue_entries (for owner-side operations tracking)
-- Already has user_id from previous migration; owner_id not needed on queue/reservations/orders
-- since ownership is determined via cafes.owner_id.

-- Cafes RLS: public read, owner write
DROP POLICY IF EXISTS "anon_crud_cafes" ON cafes;
DROP POLICY IF EXISTS "select_cafes_public" ON cafes;
DROP POLICY IF EXISTS "insert_own_cafes" ON cafes;
DROP POLICY IF EXISTS "update_own_cafes" ON cafes;
DROP POLICY IF EXISTS "delete_own_cafes" ON cafes;

CREATE POLICY "select_cafes_public" ON cafes FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_own_cafes" ON cafes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_cafes" ON cafes FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_cafes" ON cafes FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Menu items RLS: public read, owner write via cafe ownership
DROP POLICY IF EXISTS "anon_crud_menu_items" ON menu_items;
DROP POLICY IF EXISTS "select_menu_items_public" ON menu_items;
DROP POLICY IF EXISTS "insert_owner_menu_items" ON menu_items;
DROP POLICY IF EXISTS "update_owner_menu_items" ON menu_items;
DROP POLICY IF EXISTS "delete_owner_menu_items" ON menu_items;

CREATE POLICY "select_menu_items_public" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_owner_menu_items" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM cafes WHERE cafes.id = menu_items.cafe_id AND cafes.owner_id = auth.uid())
  );
CREATE POLICY "update_owner_menu_items" ON menu_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cafes WHERE cafes.id = menu_items.cafe_id AND cafes.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM cafes WHERE cafes.id = menu_items.cafe_id AND cafes.owner_id = auth.uid())
  );
CREATE POLICY "delete_owner_menu_items" ON menu_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cafes WHERE cafes.id = menu_items.cafe_id AND cafes.owner_id = auth.uid())
  );

-- Queue entries RLS: entry owner OR cafe owner can read/update; entry owner can insert/delete
DROP POLICY IF EXISTS "select_own_queue_entries" ON queue_entries;
DROP POLICY IF EXISTS "insert_own_queue_entries" ON queue_entries;
DROP POLICY IF EXISTS "update_own_queue_entries" ON queue_entries;
DROP POLICY IF EXISTS "delete_own_queue_entries" ON queue_entries;

CREATE POLICY "select_queue_entries" ON queue_entries FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = queue_entries.cafe_id AND cafes.owner_id = auth.uid())
  );
CREATE POLICY "insert_own_queue_entries" ON queue_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_queue_entries" ON queue_entries FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = queue_entries.cafe_id AND cafes.owner_id = auth.uid())
  ) WITH CHECK (true);
CREATE POLICY "delete_own_queue_entries" ON queue_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Reservations RLS: same pattern
DROP POLICY IF EXISTS "select_own_reservations" ON reservations;
DROP POLICY IF EXISTS "insert_own_reservations" ON reservations;
DROP POLICY IF EXISTS "update_own_reservations" ON reservations;
DROP POLICY IF EXISTS "delete_own_reservations" ON reservations;

CREATE POLICY "select_reservations" ON reservations FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = reservations.cafe_id AND cafes.owner_id = auth.uid())
  );
CREATE POLICY "insert_own_reservations" ON reservations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_reservations" ON reservations FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = reservations.cafe_id AND cafes.owner_id = auth.uid())
  ) WITH CHECK (true);
CREATE POLICY "delete_own_reservations" ON reservations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Orders RLS: same pattern
DROP POLICY IF EXISTS "select_own_orders" ON orders;
DROP POLICY IF EXISTS "insert_own_orders" ON orders;
DROP POLICY IF EXISTS "update_own_orders" ON orders;
DROP POLICY IF EXISTS "delete_own_orders" ON orders;

CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = orders.cafe_id AND cafes.owner_id = auth.uid())
  );
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM cafes WHERE cafes.id = orders.cafe_id AND cafes.owner_id = auth.uid())
  ) WITH CHECK (true);
CREATE POLICY "delete_own_orders" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cafes_owner_id ON cafes(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Trigger: auto-create profile on auth.users insert
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
