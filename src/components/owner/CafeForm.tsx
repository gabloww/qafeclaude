import { useState } from 'react';
import { supabase, type Cafe } from '../../lib/supabase';
import { Loader2, Save, Store, Image as ImageIcon, Clock } from 'lucide-react';

type Props = {
  userId: string;
  cafe: Cafe | null;
  onSaved: () => void;
};

export default function CafeForm({ userId, cafe, onSaved }: Props) {
  const isEdit = !!cafe;
  const [name, setName] = useState(cafe?.name || '');
  const [area, setArea] = useState(cafe?.area || '');
  const [description, setDescription] = useState(cafe?.description || '');
  const [imageUrl, setImageUrl] = useState(cafe?.image_url || '');
  const [openingHours, setOpeningHours] = useState(cafe?.opening_hours || '8am - 6pm');
  const [isOpen, setIsOpen] = useState(cafe?.is_open ?? true);
  const [totalTables, setTotalTables] = useState(cafe?.total_tables ?? 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim() || !area.trim()) {
      setError('Name and area are required');
      return;
    }
    setError('');
    setSaving(true);

    const payload = {
      name: name.trim(),
      area: area.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      opening_hours: openingHours.trim(),
      is_open: isOpen,
      total_tables: totalTables,
    };

    let success = false;

    if (isEdit) {
      const { error: updateError } = await supabase.from('cafes').update(payload).eq('id', cafe!.id);
      if (updateError) {
        setError('Failed to update cafe. Please try again.');
      } else {
        success = true;
      }
    } else {
      const { error: insertError } = await supabase.from('cafes').insert({ ...payload, owner_id: userId });
      if (insertError) {
        setError('Failed to create cafe. Please try again.');
      } else {
        success = true;
      }
    }

    setSaving(false);
    if (success) onSaved();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-coffee-900">{isEdit ? 'Edit Cafe' : 'Publish Your Cafe'}</h2>
        <p className="mt-0.5 text-sm text-coffee-400">{isEdit ? 'Update your cafe details and status' : 'Add your cafe to Qafé so customers can find you'}</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-coffee-200/60 bg-white p-5 shadow-sm">
        {/* Image preview */}
        {imageUrl && (
          <div className="relative h-36 w-full overflow-hidden rounded-2xl">
            <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-coffee-900/30 to-transparent" />
          </div>
        )}

        <Field label="Cafe Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Narrow Marrow"
            className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
        </Field>

        <Field label="Area">
          <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="George Town"
            className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
        </Field>

        <Field label="Image URL">
          <div className="relative">
            <ImageIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-300" />
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..."
              className="w-full rounded-xl border border-coffee-200 bg-cream-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
          </div>
        </Field>

        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell customers what makes your cafe special..." rows={3}
            className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
        </Field>

        <Field label="Opening Hours">
          <input type="text" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="8am - 6pm"
            className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Open / Closed">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                isOpen ? 'border-success-500/30 bg-success-500/10 text-success-600' : 'border-coffee-200 bg-cream-50 text-coffee-400'
              }`}
            >
              {isOpen ? 'Open' : 'Closed'}
              <div className={`h-5 w-10 rounded-full p-0.5 transition-colors ${isOpen ? 'bg-success-500' : 'bg-coffee-200'}`}>
                <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isOpen ? 'translate-x-5' : ''}`} />
              </div>
            </button>
          </Field>
          <Field label="Total Tables">
            <input type="number" value={totalTables} onChange={(e) => setTotalTables(Math.max(0, parseInt(e.target.value) || 0))} min={0}
              className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
          </Field>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-accent-200/60 bg-accent-50/50 p-4">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
          <p className="text-xs text-accent-700">
            Wait time and available tables are now calculated automatically based on your live queue and reservations.
          </p>
        </div>

        {error && <p className="text-sm font-medium text-error-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Publish Cafe'}</>}
        </button>
      </div>

      {!isEdit && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-coffee-200/60 bg-coffee-50 p-4">
          <Store className="mt-0.5 h-5 w-5 shrink-0 text-coffee-400" />
          <p className="text-xs text-coffee-500">
            After publishing your cafe, you'll be able to add menu items, manage your queue, accept reservations, and process pre-orders — all from this dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">{label}</label>
      {children}
    </div>
  );
}
