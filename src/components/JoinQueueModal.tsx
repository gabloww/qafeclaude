import { useState } from 'react';
import { X, Users, GraduationCap, Loader2, CheckCircle2, Phone, User, AlertTriangle } from 'lucide-react';
import { supabase, type Cafe } from '../lib/supabase';

type Props = {
  cafe: Cafe;
  queueCount: number;
  userId: string;
  userName: string;
  onClose: () => void;
  onJoined: () => void;
};

export default function JoinQueueModal({ cafe, queueCount, userId, userName, onClose, onJoined }: Props) {
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [isStudent, setIsStudent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ position: number } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    setError('');
    setSubmitting(true);

    const { data, error: rpcError } = await supabase.rpc('join_queue', {
      p_cafe_id: cafe.id,
      p_user_id: userId,
      p_customer_name: name.trim(),
      p_phone: phone.trim(),
      p_party_size: partySize,
      p_is_student: isStudent,
    });

    setSubmitting(false);

    if (rpcError) {
      setError('Failed to join queue. Please try again.');
      return;
    }

    const result = data as { error?: string; data?: { position: number } };

    if (result?.error === 'already_in_queue') {
      setError("You're already in this cafe's queue. Check My Activity for your position.");
      return;
    }
    if (result?.error) {
      setError('Failed to join queue. Please try again.');
      return;
    }
    if (!result?.data?.position) {
      setError('Failed to join queue. Please try again.');
      return;
    }

    setSuccess({ position: result.data.position });
  }

  if (success) {
    const estWait = success.position * Math.max(5, cafe.current_wait_minutes / Math.max(1, queueCount));
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/40 backdrop-blur-sm sm:items-center" onClick={onJoined}>
        <div className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 animate-pulse-ring rounded-full bg-success-500" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success-500 text-white">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-semibold text-coffee-900">You're in the queue!</h2>
            <p className="mt-1 text-sm text-coffee-500">{cafe.name}</p>
            <div className="mt-5 w-full rounded-2xl bg-coffee-50 p-5 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-coffee-400">Your Position</p>
              <p className="font-display text-5xl font-bold text-coffee-900">#{success.position}</p>
              <p className="mt-2 text-sm text-coffee-500">
                Estimated wait: <span className="font-semibold text-coffee-700">~{Math.round(estWait)} min</span>
              </p>
            </div>
            <p className="mt-4 text-xs text-coffee-400">
              Check "My Activity" to track your position. Please arrive within 10 minutes of being called.
            </p>
            <button
              onClick={onJoined}
              className="mt-5 w-full rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/40 backdrop-blur-sm sm:items-center" onClick={() => { if (!submitting) onClose(); }}>
      <div className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-coffee-900">Join the Queue</h2>
            <p className="text-sm text-coffee-400">{cafe.name} · {queueCount} ahead of you</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="flex h-9 w-9 items-center justify-center rounded-full bg-coffee-50 text-coffee-500 transition-colors hover:bg-coffee-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="012-345 6789"
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Party Size</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPartySize(Math.max(1, partySize - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-coffee-200 bg-cream-50 text-lg font-bold text-coffee-600 transition-colors hover:bg-coffee-100"
              >
                −
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-coffee-200 bg-cream-50 py-2.5">
                <Users className="h-4 w-4 text-coffee-400" />
                <span className="text-lg font-bold text-coffee-800">{partySize}</span>
              </div>
              <button
                onClick={() => setPartySize(Math.min(10, partySize + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-coffee-200 bg-cream-50 text-lg font-bold text-coffee-600 transition-colors hover:bg-coffee-100"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsStudent(!isStudent)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 transition-all ${
              isStudent
                ? 'border-accent-400 bg-accent-50'
                : 'border-coffee-200 bg-cream-50 hover:border-coffee-300'
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isStudent ? 'bg-accent-500 text-white' : 'bg-coffee-100 text-coffee-500'
            }`}>
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-coffee-800">I'm a student</p>
              <p className="text-xs text-coffee-400">Get 10% off your order</p>
            </div>
            <div className={`ml-auto h-6 w-11 rounded-full p-0.5 transition-colors ${isStudent ? 'bg-accent-500' : 'bg-coffee-200'}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isStudent ? 'translate-x-5' : ''}`} />
            </div>
          </button>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm font-medium text-error-600">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Joining...</>
            ) : (
              <>Join Queue</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
