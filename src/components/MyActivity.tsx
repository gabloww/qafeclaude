import { useEffect, useState, useCallback } from 'react';
import { Users, Calendar, ShoppingBag, Clock, GraduationCap, Loader2, X, Hash, Inbox, AlertTriangle, Coffee, Store } from 'lucide-react';
import { supabase, type Cafe, type QueueEntry, type Reservation, type Order } from '../lib/supabase';
import { formatPrice, formatDate, formatTime, timeAgo } from '../lib/format';
import { useRealtime } from '../lib/useRealtime';
import PartnerRequest from './PartnerRequest';

type Props = {
  cafes: Cafe[];
  userId: string;
};

type Activity = {
  queue: QueueEntry[];
  reservations: Reservation[];
  orders: Order[];
};

export default function MyActivity({ cafes, userId }: Props) {
  const [activity, setActivity] = useState<Activity>({ queue: [], reservations: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [confirmCancel, setConfirmCancel] = useState<{ type: 'queue' | 'reservation'; id: string; label: string } | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [showPartnerRequest, setShowPartnerRequest] = useState(false);

  const loadActivity = useCallback(async function loadActivity() {
    setError('');
    const [queueRes, resRes, orderRes] = await Promise.allSettled([
      supabase.from('queue_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('reservations').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    const next: Activity = { queue: [], reservations: [], orders: [] };
    if (queueRes.status === 'fulfilled') next.queue = queueRes.value.data || [];
    if (resRes.status === 'fulfilled') next.reservations = resRes.value.data || [];
    if (orderRes.status === 'fulfilled') next.orders = orderRes.value.data || [];

    const hasError = queueRes.status === 'rejected' || resRes.status === 'rejected' || orderRes.status === 'rejected';
    setError(hasError ? 'Some data failed to load. Showing partial results.' : '');
    setActivity(next);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  // Realtime: refetch activity when user's own data changes
  useRealtime('queue_entries', loadActivity, `user_id=eq.${userId}`);
  useRealtime('reservations', loadActivity, `user_id=eq.${userId}`);
  useRealtime('orders', loadActivity, `user_id=eq.${userId}`);

  async function confirmCancelExecute() {
    if (!confirmCancel) return;
    setCanceling(true);
    if (confirmCancel.type === 'queue') {
      await supabase.from('queue_entries').update({ status: 'cancelled' }).eq('id', confirmCancel.id);
    } else {
      await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', confirmCancel.id);
    }
    setCanceling(false);
    setConfirmCancel(null);
    loadActivity();
  }

  const cafeName = (id: string) => cafes.find((c) => c.id === id)?.name || 'Café';
  const cafeImage = (id: string) => cafes.find((c) => c.id === id)?.image_url || '';

  const statusColors: Record<string, string> = {
    waiting: 'bg-warning-500/10 text-warning-600 border-warning-500/20',
    called: 'bg-accent-500/10 text-accent-600 border-accent-500/20',
    seated: 'bg-success-500/10 text-success-600 border-success-500/20',
    cancelled: 'bg-coffee-100 text-coffee-400 border-coffee-200',
    pending: 'bg-warning-500/10 text-warning-600 border-warning-500/20',
    confirmed: 'bg-success-500/10 text-success-600 border-success-500/20',
    completed: 'bg-coffee-100 text-coffee-500 border-coffee-200',
    preparing: 'bg-accent-500/10 text-accent-600 border-accent-500/20',
    ready: 'bg-success-500/10 text-success-600 border-success-500/20',
  };

  const isActive = (status: string) => !['cancelled', 'completed', 'seated'].includes(status);

  const filteredQueue = filter === 'active' ? activity.queue.filter((q) => isActive(q.status)) : activity.queue;
  const filteredReservations = filter === 'active' ? activity.reservations.filter((r) => isActive(r.status)) : activity.reservations;
  const filteredOrders = filter === 'active' ? activity.orders.filter((o) => isActive(o.status)) : activity.orders;

  const totalCount = filteredQueue.length + filteredReservations.length + filteredOrders.length;

  if (showPartnerRequest) {
    return <PartnerRequest onBack={() => setShowPartnerRequest(false)} />;
  }

  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-semibold text-coffee-900">My Activity</h1>
        <p className="mt-0.5 text-sm text-coffee-400">Your queues, reservations, and pre-orders — all in one place.</p>

        <button
          onClick={() => setShowPartnerRequest(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent-200 bg-accent-50 py-3 text-sm font-semibold text-accent-700 transition-all hover:bg-accent-100"
        >
          <Store className="h-4 w-4" />
          Own a café? Become a Partner
        </button>

        {/* Filter toggle */}
        <div className="mt-4 flex gap-2">
          {(['active', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filter === f ? 'bg-coffee-900 text-cream-50 shadow-md' : 'bg-white text-coffee-600 border border-coffee-200 hover:border-coffee-300'
              }`}>
              {f === 'active' ? 'Active' : 'All History'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm font-medium text-error-600">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-coffee-400" />
          </div>
        ) : totalCount === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100">
              {filter === 'active' ? <Inbox className="h-7 w-7 text-coffee-400" /> : <Coffee className="h-7 w-7 text-coffee-400" />}
            </div>
            <p className="text-sm font-medium text-coffee-500">
              {filter === 'active' ? 'No active items right now.' : 'No activity yet.'}
            </p>
            <p className="mt-1 text-xs text-coffee-400">
              {filter === 'active' ? 'Check "All History" to see past visits.' : 'Join a queue or make a reservation to get started.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Queue entries */}
            {filteredQueue.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-coffee-500">
                  <Users className="h-4 w-4" /> Queue Entries
                  <span className="rounded-full bg-coffee-100 px-2 py-0.5 text-xs text-coffee-500">{filteredQueue.length}</span>
                </h2>
                <div className="space-y-3">
                  {filteredQueue.map((q) => (
                    <div key={q.id} className="flex items-center gap-3 rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
                      {cafeImage(q.cafe_id) && <img src={cafeImage(q.cafe_id)} alt="" className="h-14 w-14 rounded-xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold text-coffee-800">{cafeName(q.cafe_id)}</h3>
                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[q.status] || statusColors.pending}`}>{q.status}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-coffee-400">
                          <span className="flex items-center gap-1"><Hash className="h-3 w-3" />Position #{q.position}</span>
                          <span>{q.party_size} {q.party_size === 1 ? 'person' : 'people'}</span>
                          {q.is_student && <span className="flex items-center gap-0.5 text-accent-600"><GraduationCap className="h-3 w-3" />Student</span>}
                          <span>{timeAgo(q.created_at)}</span>
                        </div>
                      </div>
                      {q.status === 'waiting' && (
                        <button onClick={() => setConfirmCancel({ type: 'queue', id: q.id, label: cafeName(q.cafe_id) })}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coffee-50 text-coffee-400 transition-colors hover:bg-error-50 hover:text-error-500">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reservations */}
            {filteredReservations.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-coffee-500">
                  <Calendar className="h-4 w-4" /> Reservations
                  <span className="rounded-full bg-coffee-100 px-2 py-0.5 text-xs text-coffee-500">{filteredReservations.length}</span>
                </h2>
                <div className="space-y-3">
                  {filteredReservations.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
                      {cafeImage(r.cafe_id) && <img src={cafeImage(r.cafe_id)} alt="" className="h-14 w-14 rounded-xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold text-coffee-800">{cafeName(r.cafe_id)}</h3>
                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[r.status] || statusColors.pending}`}>{r.status}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-coffee-400">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(r.reservation_date)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(r.reservation_time)}</span>
                          <span>{r.party_size} {r.party_size === 1 ? 'person' : 'people'}</span>
                          {r.is_student && <span className="flex items-center gap-0.5 text-accent-600"><GraduationCap className="h-3 w-3" />Student</span>}
                        </div>
                        {r.notes && <p className="mt-1 truncate text-xs italic text-coffee-400">"{r.notes}"</p>}
                      </div>
                      {(r.status === 'pending' || r.status === 'confirmed') && (
                        <button onClick={() => setConfirmCancel({ type: 'reservation', id: r.id, label: cafeName(r.cafe_id) })}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coffee-50 text-coffee-400 transition-colors hover:bg-error-50 hover:text-error-500">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders */}
            {filteredOrders.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-coffee-500">
                  <ShoppingBag className="h-4 w-4" /> Pre-Orders
                  <span className="rounded-full bg-coffee-100 px-2 py-0.5 text-xs text-coffee-500">{filteredOrders.length}</span>
                </h2>
                <div className="space-y-3">
                  {filteredOrders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-coffee-800">{cafeName(o.cafe_id)}</h3>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[o.status] || statusColors.pending}`}>{o.status}</span>
                      </div>
                      <div className="mt-2 space-y-0.5 text-xs text-coffee-500">
                        {Array.isArray(o.items) && o.items.map((item, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{item.quantity}× {item.name}</span>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-coffee-100 pt-2">
                        <div className="flex items-center gap-2 text-xs text-coffee-400">
                          {o.is_student && <span className="flex items-center gap-0.5 text-accent-600"><GraduationCap className="h-3 w-3" />Student</span>}
                          <span>{timeAgo(o.created_at)}</span>
                        </div>
                        <span className="text-sm font-bold text-coffee-900">{formatPrice(Number(o.total))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-coffee-900/40 backdrop-blur-sm" onClick={() => setConfirmCancel(null)}>
          <div className="animate-slide-up mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-error-500/10 text-error-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-semibold text-coffee-900">Cancel {confirmCancel.type === 'queue' ? 'queue entry' : 'reservation'}?</h3>
              <p className="mt-1 text-sm text-coffee-400">Your {confirmCancel.type === 'queue' ? 'spot in the queue' : 'reservation'} at {confirmCancel.label} will be cancelled.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmCancel(null)} className="flex-1 rounded-xl border border-coffee-200 bg-cream-50 py-3 text-sm font-semibold text-coffee-600 transition-colors hover:bg-coffee-100">
                Keep It
              </button>
              <button onClick={confirmCancelExecute} disabled={canceling}
                className="flex-1 rounded-xl bg-error-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-error-600 disabled:opacity-50">
                {canceling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
