import { useState } from 'react';
import { supabase, type QueueEntry, type QueueStatus } from '../../lib/supabase';
import { Users, GraduationCap, Phone, Bell, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { timeAgo } from '../../lib/format';

type Props = {
  queue: QueueEntry[];
  onReload: () => void;
};

export default function QueueManager({ queue, onReload }: Props) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ entry: QueueEntry; action: QueueStatus } | null>(null);
  const [error, setError] = useState('');

  async function updateStatus(id: string, status: QueueStatus) {
    setUpdating(id);
    const { error: updateError } = await supabase.from('queue_entries').update({ status }).eq('id', id);
    setUpdating(null);
    if (updateError) {
      setError(`Failed to update. Please try again.`);
      return;
    }
    setError('');
    onReload();
  }

  function handleAction(entry: QueueEntry, action: QueueStatus) {
    setConfirmAction({ entry, action });
  }

  async function confirmActionExecute() {
    if (!confirmAction) return;
    await updateStatus(confirmAction.entry.id, confirmAction.action);
    setConfirmAction(null);
  }

  async function callNext() {
    const next = queue.find((q) => q.status === 'waiting');
    if (next) {
      handleAction(next, 'called');
    }
  }

  const waiting = queue.filter((q) => q.status === 'waiting');
  const called = queue.filter((q) => q.status === 'called');
  const actionLabel = confirmAction?.action === 'called' ? 'Call' : confirmAction?.action === 'seated' ? 'Seat' : 'Remove';
  const actionDesc = confirmAction?.action === 'called'
    ? `${confirmAction.entry.customer_name} will be notified that their table is ready.`
    : confirmAction?.action === 'seated'
    ? `Mark ${confirmAction.entry.customer_name} as seated and remove them from the queue.`
    : `Remove ${confirmAction?.entry.customer_name} from the queue? They'll need to re-join if they want to wait again.`;

  return (
    <div className="animate-fade-in">
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm font-medium text-error-600">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Queue Management</h2>
          <p className="text-sm text-coffee-400">{waiting.length} waiting · {called.length} called</p>
        </div>
        {waiting.length > 0 && (
          <button
            onClick={callNext}
            className="flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            <Bell className="h-4 w-4" /> Call Next
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-coffee-300" />
          <p className="text-sm font-medium text-coffee-400">Queue is empty.</p>
          <p className="mt-1 text-xs text-coffee-400">New entries will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {called.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent-600">
                <Bell className="h-3.5 w-3.5" /> Called — Waiting for Arrival
              </h3>
              <div className="space-y-2">
                {called.map((q) => (
                  <QueueCard key={q.id} q={q} updating={updating === q.id} onSeat={() => handleAction(q, 'seated')} onCancel={() => handleAction(q, 'cancelled')} />
                ))}
              </div>
            </div>
          )}

          {waiting.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-coffee-400">
                <Clock className="h-3.5 w-3.5" /> Waiting
              </h3>
              <div className="space-y-2">
                {waiting.map((q) => (
                  <QueueCard key={q.id} q={q} updating={updating === q.id} onCall={() => handleAction(q, 'called')} onSeat={() => handleAction(q, 'seated')} onCancel={() => handleAction(q, 'cancelled')} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-coffee-900/40 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="animate-slide-up mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center">
              <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
                confirmAction.action === 'cancelled' ? 'bg-error-500/10 text-error-500' : 'bg-accent-500/10 text-accent-600'
              }`}>
                {confirmAction.action === 'cancelled' ? <AlertTriangle className="h-7 w-7" /> : <Bell className="h-7 w-7" />}
              </div>
              <h3 className="font-display text-lg font-semibold text-coffee-900">{actionLabel} #{confirmAction.entry.position}?</h3>
              <p className="mt-1 text-sm text-coffee-400">{actionDesc}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl border border-coffee-200 bg-cream-50 py-3 text-sm font-semibold text-coffee-600 transition-colors hover:bg-coffee-100">
                Cancel
              </button>
              <button
                onClick={confirmActionExecute}
                disabled={updating !== null}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  confirmAction.action === 'cancelled' ? 'bg-error-500 hover:bg-error-600' : 'bg-coffee-900 hover:bg-coffee-800'
                }`}
              >
                {updating ? 'Updating...' : actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueCard({ q, updating, onCall, onSeat, onCancel }: {
  q: QueueEntry;
  updating: boolean;
  onCall?: () => void;
  onSeat: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coffee-900 text-cream-50">
        <span className="text-sm font-bold">#{q.position}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-coffee-800">{q.customer_name}</h4>
          {q.is_student && <GraduationCap className="h-3.5 w-3.5 shrink-0 text-accent-500" />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-coffee-400">
          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{q.party_size}</span>
          <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{q.phone}</span>
          <span>{timeAgo(q.created_at)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {onCall && q.status === 'waiting' && (
          <button onClick={onCall} disabled={updating}
            className="flex items-center gap-1 rounded-lg bg-accent-500/10 px-3 py-2 text-xs font-semibold text-accent-600 transition-colors hover:bg-accent-500/20 disabled:opacity-50">
            <Bell className="h-3.5 w-3.5" /> Call
          </button>
        )}
        {q.status === 'called' && (
          <button onClick={onSeat} disabled={updating}
            className="flex items-center gap-1 rounded-lg bg-success-500/10 px-3 py-2 text-xs font-semibold text-success-600 transition-colors hover:bg-success-500/20 disabled:opacity-50">
            <Check className="h-3.5 w-3.5" /> Seat
          </button>
        )}
        <button onClick={onCancel} disabled={updating}
          className="flex items-center justify-center rounded-lg bg-coffee-50 px-2.5 py-2 text-coffee-400 transition-colors hover:bg-error-50 hover:text-error-500 disabled:opacity-50">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
