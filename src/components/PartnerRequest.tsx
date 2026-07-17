import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

type Props = {
  onBack: () => void;
};

export default function PartnerRequest({ onBack }: Props) {
  const [cafeName, setCafeName] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Prefill with the signed-in user's email so they don't have to retype it.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setContactEmail(data.user.email);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!cafeName.trim() || !area.trim() || !contactEmail.trim()) {
      setError('Café name, area, and contact email are required');
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setError('Please sign in first, then submit your partner request.');
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from('owner_requests').insert({
      cafe_name: cafeName.trim(),
      area: area.trim(),
      description: description.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(),
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4">
        <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-coffee-200/60 bg-white p-8 text-center shadow-xl shadow-coffee-900/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-500/10">
            <CheckCircle2 className="h-8 w-8 text-success-600" />
          </div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Request Received!</h2>
          <p className="mt-2 text-sm text-coffee-500">
            Thanks for your interest in partnering with Qafé. Our team will review your application and reach out within 2-3 business days.
          </p>
          <button
            onClick={onBack}
            className="mt-6 rounded-2xl bg-coffee-900 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <div className="relative overflow-hidden bg-coffee-900 px-6 pb-10 pt-16">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-sm text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-accent-300">
            <Sparkles className="h-6 w-6" />
            <span className="text-sm font-medium tracking-wide uppercase">Partner Program</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-cream-50">
            List your café on Qafé
          </h1>
          <p className="mt-2 text-sm text-cream-200/70">
            Reach more customers, manage queues, and take pre-orders — all in one platform.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pt-8 sm:items-center">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="rounded-3xl border border-coffee-200/60 bg-white p-6 shadow-xl shadow-coffee-900/5">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Café Name</label>
                <input
                  type="text"
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                  placeholder="The Daily Grind"
                  className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Area / Location</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Georgetown, Penang"
                  className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your café..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="owner@cafe.com"
                  className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Contact Phone (optional)</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+60 12-345 6789"
                  className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                />
              </div>

              {error && <p className="text-sm font-medium text-error-500">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit Application <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <button onClick={onBack} className="mt-4 w-full text-center text-xs font-semibold text-coffee-400 transition-colors hover:text-coffee-600">
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
