import { useState } from 'react';
import { supabase, type Reservation, type ReservationStatus } from '../../lib/supabase';
import { Calendar, Clock, Users, GraduationCap, Phone, Check, X, MessageSquare, Inbox, AlertTriangle } from 'lucide-react';
import { formatDate, formatTime, timeAgo } from '../../lib/format';

type Props = {
  reservations: Reservation[];
  onReload: () => void;
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning-500/10 text-warning-600 border-warning-500/20',
  confirmed: 'bg-success-500/10 text-success-600 border-success-500/20',
  cancelled: 'bg-coffee-100 text-coffee-400 border-coffee-200',
  completed: 'bg-coffee-100 text-coffee-500 border-coffee-200',
};

export default function ReservationsManager({ reservations, onReload }: Props) {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ reservation: Reservation; action: ReservationStatus; label: string } | null>(null);
  const [error, setError] = useState('');

  async function updateStatus(id: string, status: ReservationStatus) {
    setUpdating(id);
    const { error: updateError } = await supabase.from('reservations').update({ status }).eq('id', id);
    setUpdating(null);
    if (updateError) {
      setError('Failed to update reservation. Please try again.');
      return;
    }
    setError('');
    onReload();
  }

  function handleAction(reservation: Reservation, action: ReservationStatus, label: string) {
    setConfirmAction({ reservation, action, label });
  }

  async function confirmExecute() {
    if (!confirmAction) return;
    await updateStatus(confirmAction.reservation.id, confirmAction.action);
    setConfirmAction(null);
  }

  const filtered = filter === 'active'
    ? reservations.filter((r) => r.status === 'pending' || r.status === 'confirmed')
    : reservations;

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;

  return (
    <div className="animate-fade-in">
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm font-medium text-error-600">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Reservations</h2>
          <p className="text-sm text-coffee-400">{pendingCount} pending · {filtered.length} shown</p>
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
          <p className="text-sm font-medium text-coffee-400">No reservations {filter === 'active' ? 'to handle' : 'yet'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-semibold text-coffee-800">{r.customer_name}</h4>
                    {r.is_student && <GraduationCap className="h-3.5 w-3.5 shrink-0 text-accent-500" />}
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[r.status] || statusColors.pending}`}>{r.status}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-coffee-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(r.reservation_date)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(r.reservation_time)}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.party_size} {r.party_size === 1 ? 'person' : 'people'}</span>
                    <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-accent-600 hover:underline"><Phone className="h-3 w-3" />{r.phone}</a>
                  </div>
                  {r.notes && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-xs italic text-coffee-400">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" /> "{r.notes}"
                    </div>
                  )}
                  <p className="mt-1 text-xs text-coffee-300">{timeAgo(r.created_at)}</p>
                </div>
              </div>

              {(r.status === 'pending' || r.status === 'confirmed') && (
                <div className="mt-3 flex gap-2">
                  {r.status === 'pending' && (
                    <button onClick={() => handleAction(r, 'confirmed', 'Confirm')} disabled={updating === r.id}
                      className="flex items-center gap-1.5 rounded-lg bg-success-500/10 px-3 py-2 text-xs font-semibold text-success-600 transition-colors hover:bg-success-500/20 disabled:opacity-50">
                      <Check className="h-3.5 w-3.5" /> Confirm
                    </button>
                  )}
                  {r.status === 'confirmed' && (
                    <button onClick={() => handleAction(r, 'completed', 'Complete')} disabled={updating === r.id}
                      className="flex items-center gap-1.5 rounded-lg bg-coffee-900 px-3 py-2 text-xs font-semibold text-cream-50 transition-colors hover:bg-coffee-800 disabled:opacity-50">
                      <Check className="h-3.5 w-3.5" /> Mark Complete
                    </button>
                  )}
                  <button onClick={() => handleAction(r, 'cancelled', 'Cancel')} disabled={updating === r.id}
                    className="flex items-center gap-1.5 rounded-lg bg-coffee-50 px-3 py-2 text-xs font-semibold text-coffee-400 transition-colors hover:bg-error-50 hover:text-error-500 disabled:opacity-50">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-coffee-900/40 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="animate-slide-up mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center">
              <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                confirmAction.action === 'cancelled' ? 'bg-error-500/10 text-error-500' : 'bg-success-500/10 text-success-600'
              }`}>
                {confirmAction.action === 'cancelled' ? <AlertTriangle className="h-7 w-7" /> : <Check className="h-7 w-7" />}
              </div>
              <h3 className="font-display text-lg font-semibold text-coffee-900">{confirmAction.label} reservation?</h3>
              <p className="mt-1 text-sm text-coffee-400">
                {confirmAction.action === 'cancelled'
                  ? `${confirmAction.reservation.customer_name}'s reservation for ${formatDate(confirmAction.reservation.reservation_date)} will be cancelled.`
                  : confirmAction.action === 'confirmed'
                  ? `Confirm ${confirmAction.reservation.customer_name}'s reservation for ${formatDate(confirmAction.reservation.reservation_date)} at ${formatTime(confirmAction.reservation.reservation_time)}.`
                  : `Mark ${confirmAction.reservation.customer_name}'s reservation as completed.`}
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
                  confirmAction.action === 'cancelled' ? 'bg-error-500 hover:bg-error-600' : confirmAction.action === 'confirmed' ? 'bg-success-500 hover:bg-success-600' : 'bg-coffee-900 hover:bg-coffee-800'
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
