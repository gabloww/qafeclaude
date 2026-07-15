/*
# Fix: auto-derive triggers can't actually update cafes for customers

1. Problem
   `recalc_available_tables` and `recalc_wait_minutes` (added in
   20260715104634) are marked SECURITY INVOKER, but both run
   `UPDATE cafes SET ...`. The `cafes` UPDATE policy only allows
   `auth.uid() = owner_id`. When a *customer* joins a queue or makes a
   reservation (the normal, common case), the trigger runs under the
   customer's own permissions -> RLS silently blocks the UPDATE (0 rows
   affected, no error raised) -> available_tables/current_wait_minutes
   never actually change for the case that matters most. It only worked
   when the cafe owner themselves inserted/edited a row.

2. Fix
   Switch both functions to SECURITY DEFINER (matching the pattern
   already used correctly elsewhere in this project, e.g.
   compute_order_totals's sibling functions) so the recalculation runs
   with elevated rights regardless of who triggered it. search_path is
   still pinned to public to avoid search_path hijacking.
*/

ALTER FUNCTION public.recalc_available_tables() SECURITY DEFINER;
ALTER FUNCTION public.recalc_wait_minutes() SECURITY DEFINER;
