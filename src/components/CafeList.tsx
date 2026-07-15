import { useEffect, useState, useCallback } from 'react';
import { Clock, MapPin, Users, ChevronRight, Search, Coffee, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, type Cafe } from '../lib/supabase';
import { getWaitBadgeClass } from '../lib/format';
import { useRealtime } from '../lib/useRealtime';

type Props = {
  onSelectCafe: (cafe: Cafe) => void;
};

export default function CafeList({ onSelectCafe }: Props) {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'short'>('all');
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});

  const loadCafes = useCallback(async () => {
    setLoadError('');
    const { data, error } = await supabase.from('cafes').select('*').order('current_wait_minutes', { ascending: true });
    if (error) {
      setLoadError('Failed to load cafés. Pull to retry.');
      setLoading(false);
      return;
    }
    if (data) {
      setCafes(data);
      const { data: queues } = await supabase
        .from('queue_entries')
        .select('cafe_id')
        .eq('status', 'waiting');
      if (queues) {
        const counts: Record<string, number> = {};
        queues.forEach((q) => {
          counts[q.cafe_id] = (counts[q.cafe_id] || 0) + 1;
        });
        setQueueCounts(counts);
      }
    }
    setLoading(false);
  }, []);

  // Realtime: refetch cafes and queue counts when any relevant table changes
  useRealtime('cafes', loadCafes);
  useRealtime('queue_entries', loadCafes);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  const filtered = cafes.filter((c) => {
    const name = (c.name || '').toLowerCase();
    const area = (c.area || '').toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !area.includes(search.toLowerCase())) return false;
    if (filter === 'open' && !c.is_open) return false;
    if (filter === 'short' && c.current_wait_minutes > 20) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden bg-coffee-900 px-4 pb-12 pt-16 sm:px-6 sm:pt-20">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-2 flex items-center gap-2 text-accent-300">
            <Coffee className="h-5 w-5" />
            <span className="text-sm font-medium tracking-wide uppercase">Penang Cafés</span>
          </div>
          <h1 className="font-display text-4xl font-semibold text-cream-50 sm:text-5xl">
            Skip the weekend wait.
          </h1>
          <p className="mt-3 max-w-lg text-base text-cream-200/80">
            Join the queue before you arrive, reserve a table, and pre-order your coffee. All in one place.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="sticky top-0 z-10 -mt-6 bg-cream-50/90 px-4 pb-3 pt-6 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-coffee-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cafés or areas..."
              className="w-full rounded-2xl border border-coffee-200 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-coffee-900 shadow-sm outline-none transition-all placeholder:text-coffee-300 focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
            />
          </div>
          <div className="mt-3 flex gap-2">
            {([
              { key: 'all', label: 'All cafés' },
              { key: 'open', label: 'Open now' },
              { key: 'short', label: 'Short wait' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-coffee-900 text-cream-50 shadow-md'
                    : 'bg-white text-coffee-600 border border-coffee-200 hover:border-coffee-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cafe Cards */}
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-coffee-400" />
            </div>
          ) : loadError ? (
            <div className="py-20 text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-coffee-300" />
              <p className="text-sm font-medium text-coffee-400">{loadError}</p>
              <button onClick={loadCafes} className="mt-2 text-sm font-semibold text-accent-600 hover:underline">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-coffee-400">
              <Coffee className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">No cafés match your search.</p>
            </div>
          ) : (
            filtered.map((cafe, i) => (
              <button
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="group flex w-full animate-slide-up overflow-hidden rounded-3xl border border-coffee-200/60 bg-white text-left shadow-sm transition-all hover:shadow-lg hover:shadow-coffee-900/5 hover:-translate-y-0.5"
              >
                <div className="relative h-28 w-28 shrink-0 overflow-hidden sm:h-32 sm:w-36">
                  <img
                    src={cafe.image_url}
                    alt={cafe.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {!cafe.is_open && (
                    <div className="absolute inset-0 flex items-center justify-center bg-coffee-900/60">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-coffee-700">Closed</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-coffee-900">{cafe.name}</h3>
                      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-coffee-300 transition-transform group-hover:translate-x-1 group-hover:text-accent-500" />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-coffee-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{cafe.area}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getWaitBadgeClass(cafe.current_wait_minutes)}`}>
                      <Clock className="h-3 w-3" />
                      {cafe.is_open ? (cafe.current_wait_minutes === 0 ? 'No wait' : `${cafe.current_wait_minutes} min`) : 'Closed'}
                    </span>
                    {queueCounts[cafe.id] > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-coffee-200 bg-coffee-50 px-2.5 py-1 text-xs font-medium text-coffee-600">
                        <Users className="h-3 w-3" />
                        {queueCounts[cafe.id]} in queue
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full border border-coffee-200 bg-coffee-50 px-2.5 py-1 text-xs font-medium text-coffee-600">
                      {cafe.available_tables}/{cafe.total_tables} tables
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
