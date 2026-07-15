import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, LogOut, Loader2, Check, X, Inbox, Clock } from 'lucide-react';
import { supabase, type OwnerRequest } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { timeAgo } from '../lib/format';

type Props = {
  userName: string;
  onSignOut: () => void;
};

export default function AdminDashboard({ userName, onSignOut }: Props) {
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [actingId, setActingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError('');
    const { data, error: loadError } = await supabase
      .from('owner_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (loadError) {
      setError('Failed to load requests.');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useRealtime('owner_requests', loadRequests);

  async function handleDecision(request: OwnerRequest, approve: boolean) {
    setActingId(request.id);
    const { data, error: rpcError } = await supabase.rpc('approve_owner_request', {
      p_request_id: request.id,
      p_approve: approve,
      p_notes: null,
    });
    setActingId(null);
    const result = data as { error?: string } | null;
    if (rpcError || result?.error) {
      setError(result?.error || 'Failed to process request.');
      return;
    }
    loadRequests();
  }

  const filtered = filter === 'pending' ? requests.filter((r) => r.status === 'pending') : requests;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-30 bg-coffee-900 px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2 text-cream-50">
            <ShieldCheck className="h-5 w-5 text-accent-300" />
            <span className="font-display text-lg font-semibold">Admin</span>
          </div>
          <button onClick={onSignOut} className="flex items-center gap-1.5 rounded-full bg-coffee-800 px-3 py-1.5 text-xs font-medium text-cream-200/80 transition-colors hover:bg-coffee-700">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="font-display text-xl font-semibold text-coffee-900">Welcome, {userName}</h1>
        <p className="mt-1 text-sm text-coffee-500">Review partner requests from people who want to list their café.</p>

        <div className="mt-5 flex rounded-2xl bg-coffee-50 p-1">
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              filter === 'pending' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-400'
            }`}
          >
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              filter === 'all' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-400'
            }`}
          >
            All Requests
          </button>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-error-500">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-coffee-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-coffee-100">
              <Inbox className="h-6 w-6 text-coffee-400" />
            </div>
            <p className="text-sm text-coffee-400">
              {filter === 'pending' ? 'No pending requests right now.' : 'No requests yet.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-coffee-900">{r.cafe_name}</p>
                    <p className="text-xs text-coffee-400">{r.area}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      r.status === 'pending'
                        ? 'bg-accent-50 text-accent-700'
                        : r.status === 'approved'
                        ? 'bg-success-500/10 text-success-600'
                        : 'bg-error-500/10 text-error-500'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.description && <p className="mt-2 text-sm text-coffee-600">{r.description}</p>}
                <div className="mt-3 space-y-0.5 text-xs text-coffee-400">
                  <p>{r.contact_email}{r.contact_phone ? ` · ${r.contact_phone}` : ''}</p>
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(r.created_at)}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDecision(r, true)}
                      disabled={actingId === r.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-success-600 disabled:opacity-50"
                    >
                      {actingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(r, false)}
                      disabled={actingId === r.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-coffee-200 py-2.5 text-sm font-semibold text-coffee-500 transition-colors hover:bg-coffee-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
