import { useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Coffee, ClipboardList, LogOut } from 'lucide-react';
import { supabase, type Cafe, type Profile } from './lib/supabase';
import { useRealtime } from './lib/useRealtime';
import Auth from './components/Auth';
import CafeList from './components/CafeList';
import CafeDetail from './components/CafeDetail';
import MyActivity from './components/MyActivity';
import OwnerDashboard from './components/OwnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import SetNewPassword from './components/SetNewPassword';

type View = 'list' | 'detail' | 'activity';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [view, setView] = useState<View>('list');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [allCafes, setAllCafes] = useState<Cafe[]>([]);

  const loadProfile = useCallback(async (userId: string, retries = 0) => {
    setProfileLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      setProfileLoading(false);
    } else if (retries < 3) {
      // Profile might not be created yet (race with trigger) — retry after delay
      setTimeout(() => loadProfile(userId, retries + 1), 500 * (retries + 1));
    } else {
      // Fallback: create profile manually. Always 'customer' — role
      // changes only ever happen through approve_owner_request now.
      const fallbackName = (session?.user?.user_metadata?.full_name as string) || '';
      const { data: created } = await supabase.from('profiles').insert({
        id: userId,
        email: session?.user?.email || '',
        full_name: fallbackName,
        role: 'customer',
      }).select().maybeSingle();
      if (created) setProfile(created as Profile);
      setProfileLoading(false);
    }
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      setSession(sess);
      if (sess) {
        loadProfile(sess.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const loadCafes = useCallback(async () => {
    const { data } = await supabase.from('cafes').select('*').order('current_wait_minutes', { ascending: true });
    if (data) setAllCafes(data);
  }, []);

  // Realtime: refetch cafes when cafe data changes
  useRealtime('cafes', loadCafes);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  function handleSelectCafe(cafe: Cafe) {
    setSelectedCafe(cafe);
    setView('detail');
    window.scrollTo({ top: 0 });
  }

  function handleBack() {
    setSelectedCafe(null);
    setView('list');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setView('list');
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <div className="flex flex-col items-center gap-3">
          <Coffee className="h-8 w-8 animate-pulse text-coffee-300" />
          <p className="text-sm text-coffee-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (passwordRecovery) {
    return <SetNewPassword onDone={() => setPasswordRecovery(false)} />;
  }

  if (!session) {
    return <Auth />;
  }

  const isOwner = profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin';
  const userName = profile?.full_name || session.user.email || 'Guest';

  // Admin view
  if (isAdmin) {
    return <AdminDashboard userName={userName} onSignOut={handleSignOut} />;
  }

  // Owner view
  if (isOwner) {
    return <OwnerDashboard userId={session.user.id} userName={userName} onSignOut={handleSignOut} />;
  }

  // Still loading profile — show loading (but only briefly, not for customers who already have profile)
  if (profileLoading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <Coffee className="h-8 w-8 animate-pulse text-coffee-300" />
      </div>
    );
  }

  // Customer view
  return (
    <div className="min-h-screen bg-cream-50">
      {view === 'list' && <CafeList onSelectCafe={handleSelectCafe} />}
      {view === 'detail' && selectedCafe && (
        <CafeDetail
          cafe={selectedCafe}
          onBack={handleBack}
          userId={session.user.id}
          userName={userName}
          allCafes={allCafes}
          onCafesChanged={loadCafes}
        />
      )}
      {view === 'activity' && <MyActivity cafes={allCafes} userId={session.user.id} />}

      {/* Bottom Nav */}
      {view !== 'detail' && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-coffee-200/60 bg-cream-50/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-around px-4 py-2">
            <button
              onClick={() => setView('list')}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
                view === 'list' ? 'text-coffee-900' : 'text-coffee-400'
              }`}
            >
              <Coffee className={`h-5 w-5 transition-transform ${view === 'list' ? 'scale-110' : ''}`} />
              <span className="text-xs font-semibold">Cafés</span>
            </button>
            <button
              onClick={() => setView('activity')}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
                view === 'activity' ? 'text-coffee-900' : 'text-coffee-400'
              }`}
            >
              <ClipboardList className={`h-5 w-5 transition-transform ${view === 'activity' ? 'scale-110' : ''}`} />
              <span className="text-xs font-semibold">My Activity</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-coffee-400 transition-colors hover:text-error-500"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs font-semibold">Sign Out</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
