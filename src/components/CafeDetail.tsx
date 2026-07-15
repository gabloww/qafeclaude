import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Clock, MapPin, Users, Calendar, ShoppingBag, UtensilsCrossed, GraduationCap, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, type Cafe, type MenuItem, STUDENT_DISCOUNT_RATE } from '../lib/supabase';
import { getWaitBadgeClass, formatPrice, getWaitLabel } from '../lib/format';
import { useRealtime } from '../lib/useRealtime';
import JoinQueueModal from './JoinQueueModal';
import ReservationModal from './ReservationModal';
import PreOrderModal from './PreOrderModal';

type Props = {
  cafe: Cafe;
  onBack: () => void;
  userId: string;
  userName: string;
  allCafes: Cafe[];
  onCafesChanged: () => void;
};

export default function CafeDetail({ cafe, onBack, userId, userName, allCafes, onCafesChanged }: Props) {
  const [liveCafe, setLiveCafe] = useState<Cafe>(cafe);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuError, setMenuError] = useState('');
  const [queueCount, setQueueCount] = useState(0);
  const [activeModal, setActiveModal] = useState<'queue' | 'reservation' | 'order' | null>(null);

  // Keep cafe data fresh from allCafes (which polls every 30s from App)
  useEffect(() => {
    const updated = allCafes.find((c) => c.id === cafe.id);
    if (updated) setLiveCafe(updated);
  }, [allCafes, cafe.id]);

  const loadMenu = useCallback(async () => {
    setMenuError('');
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('cafe_id', cafe.id)
      .order('category', { ascending: true });
    if (error) {
      setMenuError('Failed to load menu. Please try again.');
    } else {
      setMenuItems(data || []);
    }
    setLoading(false);
  }, [cafe.id]);

  const loadQueueCount = useCallback(async () => {
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('cafe_id', cafe.id)
      .eq('status', 'waiting');
    setQueueCount(count || 0);
  }, [cafe.id]);

  useEffect(() => {
    loadMenu();
    loadQueueCount();
  }, [loadMenu, loadQueueCount]);

  // Realtime: refetch queue count and cafe data when queue_entries change
  useRealtime('queue_entries', loadQueueCount, `cafe_id=eq.${cafe.id}`);
  useRealtime('cafes', loadQueueCount, `id=eq.${cafe.id}`);
  useRealtime('menu_items', loadMenu, `cafe_id=eq.${cafe.id}`);

  const categories = [...new Set(menuItems.map((m) => m.category))];
  const waitInfo = getWaitLabel(liveCafe.current_wait_minutes);
  const discountPercent = Math.round(STUDENT_DISCOUNT_RATE * 100);

  return (
    <div className="animate-fade-in pb-24">
      {/* Hero Image */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        <img src={liveCafe.image_url} alt={liveCafe.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-coffee-900 via-coffee-900/30 to-transparent" />
        <button
          onClick={onBack}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-coffee-800 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-105"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h1 className="font-display text-3xl font-semibold text-cream-50">{liveCafe.name}</h1>
          <div className="mt-1.5 flex items-center gap-3 text-cream-200/90">
            <span className="flex items-center gap-1 text-sm">
              <MapPin className="h-4 w-4" /> {liveCafe.area}
            </span>
            <span className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4" /> {liveCafe.opening_hours}
            </span>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* Status row */}
          <div className="flex flex-wrap gap-2.5">
            <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${liveCafe.is_open ? getWaitBadgeClass(liveCafe.current_wait_minutes) : 'bg-coffee-100 text-coffee-500 border-coffee-200'}`}>
              <Clock className="h-5 w-5" />
              <div>
                <p className="text-xs font-medium opacity-70">Live Wait</p>
                <p className="text-sm font-bold">{liveCafe.is_open ? waitInfo.label : 'Closed'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-coffee-200 bg-white px-4 py-3">
              <Users className="h-5 w-5 text-coffee-500" />
              <div>
                <p className="text-xs font-medium text-coffee-400">In Queue</p>
                <p className="text-sm font-bold text-coffee-700">{queueCount} waiting</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-coffee-200 bg-white px-4 py-3">
              <UtensilsCrossed className="h-5 w-5 text-coffee-500" />
              <div>
                <p className="text-xs font-medium text-coffee-400">Tables</p>
                <p className="text-sm font-bold text-coffee-700">{liveCafe.available_tables}/{liveCafe.total_tables} free</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="mt-5 text-[15px] leading-relaxed text-coffee-600">{liveCafe.description}</p>

          {/* Action buttons */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => setActiveModal('queue')}
              disabled={!liveCafe.is_open}
              className="flex items-center justify-center gap-2 rounded-2xl bg-coffee-900 px-4 py-4 text-sm font-semibold text-cream-50 shadow-md transition-all hover:bg-coffee-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Users className="h-5 w-5" />
              Join Queue
            </button>
            <button
              onClick={() => setActiveModal('reservation')}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-coffee-200 bg-white px-4 py-4 text-sm font-semibold text-coffee-800 transition-all hover:border-accent-400 hover:text-accent-600"
            >
              <Calendar className="h-5 w-5" />
              Reserve Table
            </button>
            <button
              onClick={() => setActiveModal('order')}
              disabled={!liveCafe.is_open}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-coffee-200 bg-white px-4 py-4 text-sm font-semibold text-coffee-800 transition-all hover:border-accent-400 hover:text-accent-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-5 w-5" />
              Pre-Order
            </button>
          </div>

          {/* Student discount banner */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-accent-800">{discountPercent}% Student Discount</p>
              <p className="text-xs text-accent-700/70">Show your student ID at checkout. Applies to pre-orders too.</p>
            </div>
          </div>

          {/* Menu Preview */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold text-coffee-900">Menu Preview</h2>
            <p className="mt-0.5 text-sm text-coffee-400">Browse before you arrive</p>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-coffee-400" />
              </div>
            ) : menuError ? (
              <div className="flex flex-col items-center py-12 text-center">
                <AlertTriangle className="mb-2 h-8 w-8 text-coffee-300" />
                <p className="text-sm text-coffee-400">{menuError}</p>
                <button onClick={loadMenu} className="mt-2 text-sm font-semibold text-accent-600 hover:underline">Retry</button>
              </div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center">
                <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 text-coffee-300" />
                <p className="text-sm text-coffee-400">No menu items available yet.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {categories.map((cat) => (
                  <div key={cat}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-coffee-400">{cat}</h3>
                    <div className="space-y-2">
                      {menuItems.filter((m) => m.category === cat).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl border border-coffee-200/60 bg-white p-3 transition-colors hover:border-coffee-300"
                        >
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-14 w-14 shrink-0 rounded-xl object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="truncate text-sm font-semibold text-coffee-800">{item.name}</h4>
                              <span className="shrink-0 text-sm font-bold text-coffee-900">{formatPrice(Number(item.price))}</span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-coffee-400">{item.description}</p>
                          </div>
                          {!item.is_available && (
                            <span className="shrink-0 rounded-full bg-coffee-100 px-2 py-0.5 text-xs font-medium text-coffee-500">Sold out</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'queue' && (
        <JoinQueueModal
          cafe={liveCafe}
          queueCount={queueCount}
          userId={userId}
          userName={userName}
          onClose={() => setActiveModal(null)}
          onJoined={() => { loadQueueCount(); onCafesChanged(); setActiveModal(null); }}
        />
      )}
      {activeModal === 'reservation' && (
        <ReservationModal cafe={liveCafe} userId={userId} userName={userName} onClose={() => setActiveModal(null)} onReserved={() => setActiveModal(null)} />
      )}
      {activeModal === 'order' && (
        <PreOrderModal cafe={liveCafe} menuItems={menuItems} userId={userId} userName={userName} onClose={() => setActiveModal(null)} onOrdered={() => setActiveModal(null)} />
      )}
    </div>
  );
}
