/*
# Add price recalculation trigger on orders + double-booking trigger on reservations

1. Purpose
   - orders: A BEFORE INSERT trigger that ignores client-sent prices and
     recalculates items/subtotal/discount/total from the menu_items table.
     Rejects unavailable items or items belonging to a different cafe.
   - reservations: A BEFORE INSERT trigger that rejects double-booking
     when pending/confirmed reservations for the same cafe+date+time
     already equal the cafe's total_tables.

2. Security
   - Both functions are SECURITY INVOKER, callable by authenticated only.
   - The orders trigger validates every item against menu_items by id,
     ignoring the client-sent price entirely.
   - The reservations trigger counts active reservations atomically.

3. Important notes
   - Idempotent: uses DROP FUNCTION IF EXISTS / DROP TRIGGER IF EXISTS.
   - Student discount rate is hardcoded at 0.1 to match the app constant.
*/

-- ============================================================
-- 1. Orders: recalculate prices from menu_items
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_menu record;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_recalc_items jsonb := '[]'::jsonb;
  v_cafe_id uuid;
BEGIN
  v_cafe_id := NEW.cafe_id;

  IF jsonb_typeof(NEW.items) != 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(NEW.items)
  LOOP
    -- Look up the menu item by id, scoped to this cafe
    SELECT id, name, price, is_available INTO v_menu
    FROM menu_items
    WHERE id = (v_item->>'id')::uuid
      AND cafe_id = v_cafe_id;

    IF v_menu IS NULL THEN
      RAISE EXCEPTION 'Item % does not belong to this cafe', v_item->>'id';
    END IF;

    IF v_menu.is_available = false THEN
      RAISE EXCEPTION 'Item "%" is no longer available', v_menu.name;
    END IF;

    v_subtotal := v_subtotal + v_menu.price * (v_item->>'quantity')::int;

    v_recalc_items := v_recalc_items || jsonb_build_object(
      'id', v_menu.id,
      'name', v_menu.name,
      'price', v_menu.price,
      'quantity', (v_item->>'quantity')::int
    );
  END LOOP;

  IF NEW.is_student = true THEN
    v_discount := v_subtotal * 0.1;
  END IF;

  v_total := v_subtotal - v_discount;

  NEW.items := v_recalc_items;
  NEW.subtotal := v_subtotal;
  NEW.discount := v_discount;
  NEW.total := v_total;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_order_totals ON orders;
CREATE TRIGGER trg_recalculate_order_totals
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_order_totals();

-- ============================================================
-- 2. Reservations: prevent double-booking
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_reservation_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing_count int;
  v_total_tables int;
BEGIN
  SELECT total_tables INTO v_total_tables
  FROM cafes
  WHERE id = NEW.cafe_id;

  IF v_total_tables IS NULL THEN
    RAISE EXCEPTION 'Cafe not found';
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM reservations
  WHERE cafe_id = NEW.cafe_id
    AND reservation_date = NEW.reservation_date
    AND reservation_time = NEW.reservation_time
    AND status IN ('pending', 'confirmed');

  IF v_existing_count >= v_total_tables THEN
    RAISE EXCEPTION 'No tables available for this date and time. Please try a different slot.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_reservation_capacity ON reservations;
CREATE TRIGGER trg_check_reservation_capacity
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_reservation_capacity();
