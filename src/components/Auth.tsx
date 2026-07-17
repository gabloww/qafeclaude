import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Coffee, Mail, Lock, User, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        return;
      }
      setError('Account created! Please sign in.');
      setMode('signin');
      setLoading(false);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }
  }

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} defaultEmail={email} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-coffee-900 px-6 pb-10 pt-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-sm text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-accent-300">
            <Coffee className="h-6 w-6" />
            <span className="text-sm font-medium tracking-wide uppercase">Qafé</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-cream-50">
            Skip the weekend wait.
          </h1>
          <p className="mt-2 text-sm text-cream-200/70">
            Join queues, reserve tables, and pre-order from Penang's best cafés.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-start justify-center px-4 pt-8 sm:items-center">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="rounded-3xl border border-coffee-200/60 bg-white p-6 shadow-xl shadow-coffee-900/5">
            <div className="mb-5 flex rounded-2xl bg-coffee-50 p-1">
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  mode === 'signup' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-400'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  mode === 'signin' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-400'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
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
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Password</label>
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
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="mt-1.5 text-xs font-semibold text-accent-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {error && (
                <p className={`text-sm font-medium ${error.includes('created') ? 'text-success-600' : 'text-error-500'}`}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'signup' ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-coffee-400">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
              className="font-semibold text-accent-600 hover:underline"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function ForgotPassword({ onBack, defaultEmail }: { onBack: () => void; defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setSubmitting(false);
    // Always show the same success screen even on error, so we don't reveal
    // whether an email address has an account (a common security practice).
    if (resetError) {
      console.error('Password reset error:', resetError.message);
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4">
        <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-coffee-200/60 bg-white p-8 text-center shadow-xl shadow-coffee-900/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-500/10">
            <CheckCircle2 className="h-8 w-8 text-success-600" />
          </div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Check Your Email</h2>
          <p className="mt-2 text-sm text-coffee-500">
            If an account exists for {email.trim()}, we've sent a link to reset your password.
          </p>
          <button
            onClick={onBack}
            className="mt-6 rounded-2xl bg-coffee-900 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800"
          >
            Back to Sign In
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
          <span className="font-display text-lg font-semibold">Reset Password</span>
        </div>
        <p className="mb-5 text-sm text-coffee-500">
          Enter your email and we'll send you a link to set a new password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full text-center text-sm font-semibold text-coffee-500 hover:underline"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
