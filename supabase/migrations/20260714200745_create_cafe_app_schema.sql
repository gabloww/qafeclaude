/*
# Café Queue & Reservation App — Initial Schema

1. Purpose
   A minimalist app for Penang café-goers to check live queue times, join a
   queue before arriving, reserve tables, preview menus, and pre-order items
   with a student discount. No sign-in is required (single-tenant, public data).

2. New Tables
   - `cafes`: list of Penang cafés with live wait info.
     - id (uuid pk), name, area, description, image_url, opening_hours (text),
       current_wait_minutes (int), is_open (bool), total_tables (int),
       available_tables (int), created_at.
   - `menu_items`: dishes/drinks for each café.
     - id (uuid pk), cafe_id (fk -> cafes), name, description, price (numeric),
       category, image_url, is_available (bool), created_at.
   - `queue_entries`: people who joined a virtual queue.
     - id (uuid pk), cafe_id (fk), customer_name, phone, party_size (int),
       position (int), is_student (bool), status (text: waiting|called|seated|cancelled),
       created_at.
   - `reservations`: table bookings.
     - id (uuid pk), cafe_id (fk), customer_name, phone, party_size (int),
       reservation_date (date), reservation_time (time), is_student (bool),
       status (text: pending|confirmed|cancelled|completed), notes, created_at.
   - `orders`: pre-orders placed before arrival.
     - id (uuid pk), cafe_id (fk), customer_name, phone, items (jsonb),
       subtotal (numeric), discount (numeric), total (numeric), is_student (bool),
       status (text: pending|preparing|ready|completed|cancelled), created_at.

3. Security
   - RLS enabled on every table.
   - All tables are intentionally public/shared (no sign-in app), so policies
     use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`.
*/

-- cafes
CREATE TABLE IF NOT EXISTS cafes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  opening_hours text NOT NULL DEFAULT '8am - 6pm',
  current_wait_minutes int NOT NULL DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true,
  total_tables int NOT NULL DEFAULT 10,
  available_tables int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_cafes" ON cafes;
CREATE POLICY "anon_crud_cafes" ON cafes FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Other',
  image_url text NOT NULL DEFAULT '',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_menu_items" ON menu_items;
CREATE POLICY "anon_crud_menu_items" ON menu_items FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- queue_entries
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  party_size int NOT NULL DEFAULT 1,
  position int NOT NULL DEFAULT 1,
  is_student boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_queue_entries" ON queue_entries;
CREATE POLICY "anon_crud_queue_entries" ON queue_entries FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- reservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  party_size int NOT NULL DEFAULT 1,
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  is_student boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_reservations" ON reservations;
CREATE POLICY "anon_crud_reservations" ON reservations FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id uuid NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  is_student boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_orders" ON orders;
CREATE POLICY "anon_crud_orders" ON orders FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_cafe_id ON menu_items(cafe_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_cafe_id ON queue_entries(cafe_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_reservations_cafe_id ON reservations(cafe_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_orders_cafe_id ON orders(cafe_id);
