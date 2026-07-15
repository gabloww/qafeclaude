import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

/**
 * Subscribes to realtime changes on a table and calls `onChange` for every
 * payload. The caller is responsible for refetching or merging the payload
 * into its own state. The subscription is scoped to the given filter
 * (e.g. `cafe_id=eq.123`).
 */
export function useRealtime(
  table: string,
  onChange: () => void,
  filter?: string,
) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    const channelKey = filter
      ? `${table}:${filter}`
      : table;

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: filter ? filter : undefined },
        () => callbackRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
