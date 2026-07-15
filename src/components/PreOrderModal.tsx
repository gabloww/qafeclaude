import { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, GraduationCap, Loader2, CheckCircle2, Phone, User, Trash2 } from 'lucide-react';
import { supabase, type Cafe, type MenuItem, type OrderItem, type Order, STUDENT_DISCOUNT_RATE } from '../lib/supabase';
import { formatPrice } from '../lib/format';

type Props = {
  cafe: Cafe;
  menuItems: MenuItem[];
  userId: string;
  userName: string;
  onClose: () => void;
  onOrdered: () => void;
};

export default function PreOrderModal({ cafe, menuItems, userId, userName, onClose, onOrdered }: Props) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverOrder, setServerOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const categories = [...new Set(menuItems.map((m) => m.category))];

  const cartItems: OrderItem[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = menuItems.find((m) => m.id === id)!;
      return { id, name: item.name, price: Number(item.price), quantity: qty };
    });

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = isStudent ? subtotal * STUDENT_DISCOUNT_RATE : 0;
  const total = subtotal - discount;

  function adjustQty(id: string, delta: number) {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit() {
    if (cartItems.length === 0) { setError('Add at least one item to your order'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    setError('');
    setSubmitting(true);

    const { data: insertedOrder, error: insertError } = await supabase.from('orders').insert({
      cafe_id: cafe.id,
      user_id: userId,
      customer_name: name.trim(),
      phone: phone.trim(),
      items: cartItems,
      subtotal,
      discount,
      total,
      is_student: isStudent,
      status: 'pending',
    }).select().single();

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setServerOrder(insertedOrder as Order);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/40 backdrop-blur-sm sm:items-center" onClick={onOrdered}>
        <div className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 animate-pulse-ring rounded-full bg-success-500" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success-500 text-white">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-semibold text-coffee-900">Order Placed!</h2>
            <p className="mt-1 text-sm text-coffee-500">{cafe.name}</p>
            <div className="mt-5 w-full rounded-2xl bg-coffee-50 p-5">
              <div className="space-y-1.5 text-left text-sm">
                {Array.isArray(serverOrder?.items) && serverOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-coffee-600">
                    <span>{item.quantity}× {item.name}</span>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="mt-2 border-t border-coffee-200 pt-2">
                  {serverOrder && Number(serverOrder.discount) > 0 && (
                    <div className="flex justify-between text-xs text-success-600">
                      <span>Student discount (10%)</span>
                      <span>−{formatPrice(Number(serverOrder.discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-coffee-900">
                    <span>Total</span>
                    <span>{formatPrice(Number(serverOrder?.total ?? 0))}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-coffee-400">Pick up your order at {cafe.name}. You'll receive a text when it's ready.</p>
            <button onClick={onOrdered} className="mt-5 w-full rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="animate-slide-up flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-coffee-100 p-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-coffee-900">Pre-Order</h2>
            <p className="text-sm text-coffee-400">{cafe.name}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-coffee-50 text-coffee-500 transition-colors hover:bg-coffee-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu list (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-coffee-400">{cat}</h3>
                <div className="space-y-2">
                  {menuItems.filter((m) => m.category === cat && m.is_available).map((item) => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${qty > 0 ? 'border-accent-300 bg-accent-50/50' : 'border-coffee-200/60 bg-white'}`}>
                        {item.image_url && <img src={item.image_url} alt={item.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold text-coffee-800">{item.name}</h4>
                          <p className="mt-0.5 line-clamp-1 text-xs text-coffee-400">{item.description}</p>
                          <p className="mt-0.5 text-sm font-bold text-coffee-900">{formatPrice(Number(item.price))}</p>
                        </div>
                        {qty === 0 ? (
                          <button onClick={() => adjustQty(item.id, 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coffee-900 text-cream-50 transition-colors hover:bg-coffee-800">
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button onClick={() => adjustQty(item.id, -1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-coffee-200 text-coffee-600 transition-colors hover:bg-coffee-50">
                              {qty === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-coffee-800">{qty}</span>
                            <button onClick={() => adjustQty(item.id, 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-coffee-900 text-cream-50 transition-colors hover:bg-coffee-800">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Customer info */}
          <div className="mt-6 space-y-3 border-t border-coffee-100 pt-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                  className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012-345 6789"
                  className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
              </div>
            </div>
            <button onClick={() => setIsStudent(!isStudent)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 transition-all ${isStudent ? 'border-accent-400 bg-accent-50' : 'border-coffee-200 bg-cream-50 hover:border-coffee-300'}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${isStudent ? 'bg-accent-500 text-white' : 'bg-coffee-100 text-coffee-500'}`}>
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
          </div>
        </div>

        {/* Footer / Cart summary */}
        <div className="shrink-0 border-t border-coffee-100 bg-white p-5">
          {cartItems.length > 0 ? (
            <div className="mb-3 space-y-1 text-sm">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-coffee-500">
                  <span>{item.quantity}× {item.name}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {isStudent && (
                <div className="flex justify-between text-xs font-medium text-success-600">
                  <span>Student discount (10%)</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="mb-3 text-sm text-coffee-400">Your cart is empty. Add items from the menu above.</p>
          )}
          {error && <p className="mb-2 text-sm font-medium text-error-500">{error}</p>}
          <button onClick={handleSubmit} disabled={submitting || cartItems.length === 0}
            className="flex w-full items-center justify-between gap-2 rounded-2xl bg-coffee-900 px-5 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Placing order...</>
            ) : (
              <>
                <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Place Order</span>
                <span>{formatPrice(total)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
