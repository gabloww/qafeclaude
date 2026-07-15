import { useState } from 'react';
import { X, Users, Calendar, Clock, GraduationCap, Loader2, CheckCircle2, Phone, User, MessageSquare } from 'lucide-react';
import { supabase, type Cafe } from '../lib/supabase';
import { formatDate } from '../lib/format';

type Props = {
  cafe: Cafe;
  userId: string;
  userName: string;
  onClose: () => void;
  onReserved: () => void;
};

export default function ReservationModal({ cafe, userId, userName, onClose, onReserved }: Props) {
  const today = new Date();
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [time, setTime] = useState('12:00');
  const [isStudent, setIsStudent] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

  async function handleSubmit() {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (!date || !time) { setError('Please select a date and time'); return; }
    setError('');
    setSubmitting(true);

    const { error: insertError } = await supabase.from('reservations').insert({
      cafe_id: cafe.id,
      user_id: userId,
      customer_name: name.trim(),
      phone: phone.trim(),
      party_size: partySize,
      reservation_date: date,
      reservation_time: time,
      is_student: isStudent,
      status: 'pending',
      notes: notes.trim(),
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/40 backdrop-blur-sm sm:items-center" onClick={onReserved}>
        <div className="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 animate-pulse-ring rounded-full bg-success-500" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success-500 text-white">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-semibold text-coffee-900">Reservation Requested!</h2>
            <p className="mt-1 text-sm text-coffee-500">{cafe.name}</p>
            <div className="mt-5 w-full space-y-2 rounded-2xl bg-coffee-50 p-5 text-left">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-coffee-400" />
                <span className="font-medium text-coffee-700">{formatDate(date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-coffee-400" />
                <span className="font-medium text-coffee-700">{time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-coffee-400" />
                <span className="font-medium text-coffee-700">{partySize} {partySize === 1 ? 'person' : 'people'}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-coffee-400">
              The café will confirm your reservation shortly. You'll receive a text at {phone}.
            </p>
            <button onClick={onReserved} className="mt-5 w-full rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-coffee-900/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="animate-slide-up my-auto w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-coffee-900">Reserve a Table</h2>
            <p className="text-sm text-coffee-400">{cafe.name}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-coffee-50 text-coffee-500 transition-colors hover:bg-coffee-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
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

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Party Size</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setPartySize(Math.max(1, partySize - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-coffee-200 bg-cream-50 text-lg font-bold text-coffee-600 transition-colors hover:bg-coffee-100">−</button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-coffee-200 bg-cream-50 py-2.5">
                <Users className="h-4 w-4 text-coffee-400" />
                <span className="text-lg font-bold text-coffee-800">{partySize}</span>
              </div>
              <button onClick={() => setPartySize(Math.min(12, partySize + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-coffee-200 bg-cream-50 text-lg font-bold text-coffee-600 transition-colors hover:bg-coffee-100">+</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Date</label>
              <input type="date" value={date} min={today.toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-3 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Time</label>
              <select value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-3 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20">
                {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Notes (optional)</label>
            <div className="relative">
              <MessageSquare className="absolute left-3.5 top-3.5 h-4 w-4 text-coffee-300" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Window seat, high chair, etc." rows={2}
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

          {error && <p className="text-sm font-medium text-error-500">{error}</p>}

          <button onClick={handleSubmit} disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:opacity-50">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Requesting...</> : <>Request Reservation</>}
          </button>
        </div>
      </div>
    </div>
  );
}
