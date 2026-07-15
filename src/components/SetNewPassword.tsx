import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Coffee, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

type Props = {
  onDone: () => void;
};

export default function SetNewPassword({ onDone }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4">
        <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-coffee-200/60 bg-white p-8 text-center shadow-xl shadow-coffee-900/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-500/10">
            <CheckCircle2 className="h-8 w-8 text-success-600" />
          </div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Password Updated</h2>
          <p className="mt-2 text-sm text-coffee-500">You're all set. Continue into the app.</p>
          <button
            onClick={onDone}
            className="mt-6 rounded-2xl bg-coffee-900 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4">
      <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-coffee-200/60 bg-white p-6 shadow-xl shadow-coffee-900/5">
        <div className="mb-1 flex items-center gap-2 text-coffee-900">
          <Coffee className="h-5 w-5" />
          <span className="font-display text-lg font-semibold">Set New Password</span>
        </div>
        <p className="mb-5 text-sm text-coffee-500">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
              />
            </div>
          </div>
          {error && <p className="text-sm font-medium text-error-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                Update Password
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
