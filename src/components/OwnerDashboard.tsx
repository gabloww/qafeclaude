import { useEffect, useState, useCallback } from 'react';
import { supabase, type Cafe, type MenuItem, type QueueEntry, type Reservation, type Order } from '../lib/supabase';
import { Store, UtensilsCrossed, Users, Calendar, ShoppingBag, Plus, LogOut, Loader2, Coffee, Clock, Bell } from 'lucide-react';
import CafeForm from './owner/CafeForm';
import MenuManager from './owner/MenuManager';
import QueueManager from './owner/QueueManager';
import ReservationsManager from './owner/ReservationsManager';
import OrdersManager from './owner/OrdersManager';
import { useRealtime } from '../lib/useRealtime';

type Props = {
  userId: string;
  userName: string;
  onSignOut: () => void;
};

type Tab = 'overview' | 'cafe' | 'menu' | 'queue' | 'reservations' | 'orders';

export default function OwnerDashboard({ userId, userName, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [activeCafeId, setActiveCafeId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCafeForm, setShowCafeForm] = useState(false);
  const [isNewCafe, setIsNewCafe] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  const loadCafes = useCallback(async () => {
    const { data } = await supabase.from('cafes').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
    const cafesData = data || [];
    setCafes(cafesData);
    if (cafesData.length > 0) {
      setActiveCafeId((prev) => prev || cafesData[0].id);
    } else {
      setActiveCafeId(null);
    }
    setLoading(false);
  }, [userId]);

  const loadCafeData = useCallback(async () => {
    if (!activeCafeId) return;
    const [menuRes, queueRes, resRes, orderRes] = await Promise.allSettled([
      supabase.from('menu_items').select('*').eq('cafe_id', activeCafeId).order('category', { ascending: true }),
      supabase.from('queue_entries').select('*').eq('cafe_id', activeCafeId).order('position', { ascending: true }),
      supabase.from('reservations').select('*').eq('cafe_id', activeCafeId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('cafe_id', activeCafeId).order('created_at', { ascending: false }),
    ]);

    const newQueue = queueRes.status === 'fulfilled' ? (queueRes.value.data || []).filter((q) => q.status !== 'cancelled' && q.status !== 'seated') : [];
    const newReservations = resRes.status === 'fulfilled' ? (resRes.value.data || []) : [];
    const newOrders = orderRes.status === 'fulfilled' ? (orderRes.value.data || []) : [];

    // Detect new entries for notifications
    setQueue((prev) => {
      const prevIds = new Set(prev.map((q) => q.id));
      const newEntries = newQueue.filter((q) => !prevIds.has(q.id) && q.status === 'waiting');
      if (prev.length > 0 && newEntries.length > 0) {
        setNotifications((n) => [...newEntries.map((e) => `${e.customer_name} joined the queue (position #${e.position})`), ...n].slice(0, 5));
      }
      return newQueue;
    });

    setReservations((prev) => {
      const prevIds = new Set(prev.map((r) => r.id));
      const newEntries = newReservations.filter((r) => !prevIds.has(r.id) && r.status === 'pending');
      if (prev.length > 0 && newEntries.length > 0) {
        setNotifications((n) => [...newEntries.map((e) => `New reservation from ${e.customer_name}`), ...n].slice(0, 5));
      }
      return newReservations;
    });

    setOrders((prev) => {
      const prevIds = new Set(prev.map((o) => o.id));
      const newEntries = newOrders.filter((o) => !prevIds.has(o.id) && o.status === 'pending');
      if (prev.length > 0 && newEntries.length > 0) {
        setNotifications((n) => [...newEntries.map((e) => `New pre-order from ${e.customer_name}`), ...n].slice(0, 5));
      }
      return newOrders;
    });

    setMenuItems(menuRes.status === 'fulfilled' ? (menuRes.value.data || []) : []);
  }, [activeCafeId]);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  useEffect(() => {
    loadCafeData();
  }, [loadCafeData]);

  // Realtime: refetch cafe data when relevant tables change
  useRealtime('queue_entries', loadCafeData, activeCafeId ? `cafe_id=eq.${activeCafeId}` : undefined);
  useRealtime('reservations', loadCafeData, activeCafeId ? `cafe_id=eq.${activeCafeId}` : undefined);
  useRealtime('orders', loadCafeData, activeCafeId ? `cafe_id=eq.${activeCafeId}` : undefined);
  useRealtime('menu_items', loadCafeData, activeCafeId ? `cafe_id=eq.${activeCafeId}` : undefined);
  useRealtime('cafes', loadCafes, `owner_id=eq.${userId}`);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => setNotifications((n) => n.slice(0, -1)), 5000);
    return () => clearTimeout(timer);
  }, [notifications]);

  const activeCafe = cafes.find((c) => c.id === activeCafeId) || null;
  const waitingCount = queue.filter((q) => q.status === 'waiting').length;
  const pendingResCount = reservations.filter((r) => r.status === 'pending').length;
  const activeOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <Loader2 className="h-6 w-6 animate-spin text-coffee-400" />
      </div>
    );
  }

  // No cafes yet — show cafe form directly
  if (cafes.length === 0 && !showCafeForm) {
    return (
      <div className="min-h-screen bg-cream-50">
        <header className="flex items-center justify-between bg-coffee-900 px-5 py-4">
          <div className="flex items-center gap-2 text-cream-50">
            <Store className="h-5 w-5 text-accent-300" />
            <span className="font-display text-lg font-semibold">Owner Dashboard</span>
          </div>
          <button onClick={onSignOut} className="flex items-center gap-1.5 text-xs font-medium text-cream-200/70 transition-colors hover:text-cream-50">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100">
            <Store className="h-7 w-7 text-coffee-400" />
          </div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Welcome, {userName}!</h2>
          <p className="mt-1 max-w-xs text-center text-sm text-coffee-400">You haven't published any cafes yet. Let's add your first one.</p>
          <button
            onClick={() => { setIsNewCafe(true); setShowCafeForm(true); }}
            className="mt-5 flex items-center gap-2 rounded-2xl bg-coffee-900 px-6 py-3.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800"
          >
            <Plus className="h-5 w-5" /> Publish Your First Cafe
          </button>
        </div>
        {showCafeForm && isNewCafe && (
          <CafeForm
            userId={userId}
            cafe={null}
            onSaved={() => { loadCafes(); setShowCafeForm(false); setIsNewCafe(false); setTab('overview'); }}
          />
        )}
      </div>
    );
  }

  if (showCafeForm) {
    return (
      <div className="min-h-screen bg-cream-50">
        <header className="sticky top-0 z-30 bg-coffee-900 px-5 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <button onClick={() => setShowCafeForm(false)} className="flex items-center gap-2 text-cream-50">
              <Store className="h-5 w-5 text-accent-300" />
              <span className="font-display text-lg font-semibold">{isNewCafe ? 'Add New Cafe' : 'Edit Cafe'}</span>
            </button>
            <button onClick={onSignOut} className="flex items-center gap-1.5 rounded-full bg-coffee-800 px-3 py-1.5 text-xs font-medium text-cream-200/80 transition-colors hover:bg-coffee-700">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </header>
        <CafeForm
          userId={userId}
          cafe={isNewCafe ? null : activeCafe}
          onSaved={() => { loadCafes(); setShowCafeForm(false); setIsNewCafe(false); setTab('overview'); }}
        />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Store; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Coffee },
    { key: 'cafe', label: 'Cafe Info', icon: Store },
    { key: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { key: 'queue', label: 'Queue', icon: Users, badge: waitingCount },
    { key: 'reservations', label: 'Reservations', icon: Calendar, badge: pendingResCount },
    { key: 'orders', label: 'Orders', icon: ShoppingBag, badge: activeOrdersCount },
  ];

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-coffee-900 px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2 text-cream-50">
            <Store className="h-5 w-5 text-accent-300" />
            <span className="font-display text-lg font-semibold">Owner Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-cream-200/60 sm:inline">{userName}</span>
            <button onClick={onSignOut} className="flex items-center gap-1.5 rounded-full bg-coffee-800 px-3 py-1.5 text-xs font-medium text-cream-200/80 transition-colors hover:bg-coffee-700 hover:text-cream-50">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Cafe selector + Add button */}
      <div className="border-b border-coffee-200/60 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
            {cafes.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCafeId(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  c.id === activeCafeId
                    ? 'bg-coffee-900 text-cream-50'
                    : 'bg-coffee-50 text-coffee-500 hover:bg-coffee-100'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setIsNewCafe(true); setShowCafeForm(true); }}
            className="flex shrink-0 items-center gap-1 rounded-full border border-coffee-200 px-3 py-1.5 text-xs font-semibold text-coffee-600 transition-colors hover:bg-coffee-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add Cafe
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[57px] z-20 border-b border-coffee-200/60 bg-cream-50/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-coffee-900 text-cream-50 shadow-sm'
                  : 'text-coffee-400 hover:bg-coffee-50'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${
                  tab === t.key ? 'bg-accent-400 text-coffee-900' : 'bg-accent-500 text-white'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-5 py-6">
        {tab === 'overview' && activeCafe && (
          <div className="animate-fade-in">
            <div className="overflow-hidden rounded-3xl border border-coffee-200/60 bg-white shadow-sm">
              <div className="relative h-40 w-full overflow-hidden">
                {activeCafe.image_url && <img src={activeCafe.image_url} alt={activeCafe.name} className="h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-coffee-900/70 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <h2 className="font-display text-2xl font-semibold text-cream-50">{activeCafe.name}</h2>
                  <p className="text-sm text-cream-200/80">{activeCafe.area} · {activeCafe.opening_hours}</p>
                </div>
                <div className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold ${activeCafe.is_open ? 'bg-success-500 text-white' : 'bg-coffee-700 text-cream-200'}`}>
                  {activeCafe.is_open ? 'Open' : 'Closed'}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={Clock} label="Wait Time" value={`${activeCafe.current_wait_minutes}m`} color="text-warning-600" bg="bg-warning-500/10" />
              <StatCard icon={Users} label="In Queue" value={waitingCount} color="text-accent-600" bg="bg-accent-500/10" />
              <StatCard icon={Calendar} label="Pending Res." value={pendingResCount} color="text-coffee-600" bg="bg-coffee-100" />
              <StatCard icon={ShoppingBag} label="Active Orders" value={activeOrdersCount} color="text-success-600" bg="bg-success-500/10" />
            </div>

            <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-coffee-400">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <QuickAction icon={Users} label="Manage Queue" onClick={() => setTab('queue')} />
              <QuickAction icon={Calendar} label="Reservations" onClick={() => setTab('reservations')} />
              <QuickAction icon={ShoppingBag} label="Orders" onClick={() => setTab('orders')} />
              <QuickAction icon={UtensilsCrossed} label="Edit Menu" onClick={() => setTab('menu')} />
              <QuickAction icon={Store} label="Cafe Info" onClick={() => setTab('cafe')} />
              <QuickAction icon={Plus} label="Add Cafe" onClick={() => { setIsNewCafe(true); setShowCafeForm(true); }} />
            </div>
          </div>
        )}

        {tab === 'cafe' && (
          <CafeForm userId={userId} cafe={activeCafe} onSaved={() => { loadCafes(); setTab('overview'); }} />
        )}

        {tab === 'menu' && activeCafe && (
          <MenuManager cafeId={activeCafe.id} menuItems={menuItems} onReload={loadCafeData} />
        )}

        {tab === 'queue' && activeCafe && (
          <QueueManager queue={queue} onReload={loadCafeData} />
        )}

        {tab === 'reservations' && activeCafe && (
          <ReservationsManager reservations={reservations} onReload={loadCafeData} />
        )}

        {tab === 'orders' && activeCafe && (
          <OrdersManager orders={orders} onReload={loadCafeData} />
        )}
      </div>

      {/* Toast notifications */}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          {notifications.slice(0, 3).map((msg, i) => (
            <div
              key={i}
              className="animate-slide-down flex items-center gap-2.5 rounded-2xl bg-coffee-900 px-4 py-3 shadow-2xl"
            >
              <Bell className="h-4 w-4 shrink-0 text-accent-300" />
              <span className="text-sm font-medium text-cream-50">{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof Store; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="rounded-2xl border border-coffee-200/60 bg-white p-4 shadow-sm">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-coffee-900">{value}</p>
      <p className="text-xs font-medium text-coffee-400">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Store; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-coffee-200/60 bg-white p-4 text-left shadow-sm transition-all hover:border-accent-300 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coffee-50 text-coffee-600">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-semibold text-coffee-700">{label}</span>
    </button>
  );
}
