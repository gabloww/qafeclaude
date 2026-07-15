import { useState } from 'react';
import { supabase, type Order, type OrderStatus } from '../../lib/supabase';
import { GraduationCap, Phone, Clock, Check, X, ChefHat, PackageCheck, Inbox, AlertTriangle } from 'lucide-react';
import { formatPrice, timeAgo } from '../../lib/format';

type Props = {
  orders: Order[];
  onReload: () => void;
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning-500/10 text-warning-600 border-warning-500/20',
  preparing: 'bg-accent-500/10 text-accent-600 border-accent-500/20',
  ready: 'bg-success-500/10 text-success-600 border-success-500/20',
  completed: 'bg-coffee-100 text-coffee-500 border-coffee-200',
  cancelled: 'bg-coffee-100 text-coffee-400 border-coffee-200',
};

const statusFlow: Record<string, { label: string; icon: typeof Check; next: OrderStatus } | null> = {
  pending: { label: 'Start Preparing', icon: ChefHat, next: 'preparing' },
  preparing: { label: 'Mark Ready', icon: PackageCheck, next: 'ready' },
  ready: { label: 'Complete', icon: Check, next: 'completed' },
  completed: null,
  cancelled: null,
};

export default function OrdersManager({ orders, onReload }: Props) {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: OrderStatus; label: string } | null>(null);
  const [error, setError] = useState('');

  async function updateStatus(id: string, status: OrderStatus) {
    setUpdating(id);
    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', id);
    setUpdating(null);
    if (updateError) {
      setError('Failed to update order. Please try again.');
      return;
    }
    setError('');
    onReload();
  }

  function handleAction(order: Order, action: OrderStatus, label: string) {
    setConfirmAction({ order, action, label });
  }

  async function confirmExecute() {
    if (!confirmAction) return;
    await updateStatus(confirmAction.order.id, confirmAction.action);
    setConfirmAction(null);
  }

  const filtered = filter === 'active'
    ? orders.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
    : orders;

  const activeCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const todayRevenue = orders
    .filter((o) => o.status === 'completed' && new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="animate-fade-in">
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm font-medium text-error-600">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Pre-Orders</h2>
          <p className="text-sm text-coffee-400">{activeCount} active · {todayRevenue > 0 && `RM${todayRevenue.toFixed(2)} completed today`}</p>
        </div>
        <div className="flex rounded-xl bg-coffee-50 p-1">
          {(['active', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-400'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-coffee-300" />
          <p className="text-sm font-medium text-coffee-400">No orders {filter === 'active' ? 'in progress' : 'yet'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const action = statusFlow[o.status];
            return (
              <div key={o.id} className="rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-semibold text-coffee-800">{o.customer_name}</h4>
                      {o.is_student && <GraduationCap className="h-3.5 w-3.5 shrink-0 text-accent-500" />}
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[o.status] || statusColors.pending}`}>{o.status}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-coffee-400">
                      <a href={`tel:${o.phone}`} className="flex items-center gap-1 text-accent-600 hover:underline"><Phone className="h-3 w-3" />{o.phone}</a>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(o.created_at)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-coffee-900">{formatPrice(Number(o.total))}</span>
                </div>

                {/* Items */}
                <div className="mt-2.5 space-y-0.5 rounded-xl bg-coffee-50 p-3">
                  {Array.isArray(o.items) && o.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-coffee-600">
                      <span>{item.quantity}× {item.name}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {o.is_student && Number(o.discount) > 0 && (
                    <div className="mt-1 border-t border-coffee-200 pt-1 text-xs text-success-600">
                      Student discount: −{formatPrice(Number(o.discount))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  {action && (
                    <button onClick={() => handleAction(o, action.next, action.label)} disabled={updating === o.id}
                      className="flex items-center gap-1.5 rounded-lg bg-coffee-900 px-3 py-2 text-xs font-semibold text-cream-50 transition-colors hover:bg-coffee-800 disabled:opacity-50">
                      <action.icon className="h-3.5 w-3.5" /> {action.label}
                    </button>
                  )}
                  {(o.status === 'pending' || o.status === 'preparing') && (
                    <button onClick={() => handleAction(o, 'cancelled', 'Cancel')} disabled={updating === o.id}
                      className="flex items-center gap-1.5 rounded-lg bg-coffee-50 px-3 py-2 text-xs font-semibold text-coffee-400 transition-colors hover:bg-error-50 hover:text-error-500 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-coffee-900/40 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="animate-slide-up mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center">
              <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                confirmAction.action === 'cancelled' ? 'bg-error-500/10 text-error-500' : 'bg-coffee-100 text-coffee-600'
              }`}>
                {confirmAction.action === 'cancelled' ? <AlertTriangle className="h-7 w-7" /> : <Check className="h-7 w-7" />}
              </div>
              <h3 className="font-display text-lg font-semibold text-coffee-900">{confirmAction.label} order?</h3>
              <p className="mt-1 text-sm text-coffee-400">
                {confirmAction.action === 'cancelled'
                  ? `${confirmAction.order.customer_name}'s order will be cancelled.`
                  : confirmAction.action === 'preparing'
                  ? `Start preparing ${confirmAction.order.customer_name}'s order.`
                  : confirmAction.action === 'ready'
                  ? `Mark ${confirmAction.order.customer_name}'s order as ready for pickup.`
                  : `Mark ${confirmAction.order.customer_name}'s order as completed.`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl border border-coffee-200 bg-cream-50 py-3 text-sm font-semibold text-coffee-600 transition-colors hover:bg-coffee-100">
                Go Back
              </button>
              <button
                onClick={confirmExecute}
                disabled={updating !== null}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  confirmAction.action === 'cancelled' ? 'bg-error-500 hover:bg-error-600' : 'bg-coffee-900 hover:bg-coffee-800'
                }`}
              >
                {updating ? 'Updating...' : confirmAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
