import { useState } from 'react';
import { supabase, type MenuItem } from '../../lib/supabase';
import { Plus, Trash2, X, Loader2, UtensilsCrossed, Edit3, Check, AlertTriangle } from 'lucide-react';
import { formatPrice } from '../../lib/format';

type Props = {
  cafeId: string;
  menuItems: MenuItem[];
  onReload: () => void;
};

export default function MenuManager({ cafeId, menuItems, onReload }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  const categories = [...new Set(menuItems.map((m) => m.category))].sort();

  async function toggleAvailable(item: MenuItem) {
    const { error } = await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    if (error) {
      alert('Failed to update item. Please try again.');
      return;
    }
    onReload();
  }

  async function confirmDelete() {
    if (!deletingItem) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', deletingItem.id);
    setDeletingItem(null);
    if (error) {
      alert('Failed to delete item. Please try again.');
      return;
    }
    onReload();
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-coffee-900">Menu</h2>
          <p className="text-sm text-coffee-400">{menuItems.length} items</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-coffee-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-coffee-800"
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {menuItems.length === 0 ? (
        <div className="py-16 text-center">
          <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-coffee-300" />
          <p className="text-sm font-medium text-coffee-400">No menu items yet.</p>
          <p className="mt-1 text-xs text-coffee-400">Add your first item to get started.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-coffee-400">{cat}</h3>
              <div className="space-y-2">
                {menuItems.filter((m) => m.category === cat).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-coffee-200/60 bg-white p-3 shadow-sm">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="h-12 w-12 rounded-xl object-cover" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="truncate text-sm font-semibold text-coffee-800">{item.name}</h4>
                        <span className="shrink-0 text-sm font-bold text-coffee-900">{formatPrice(Number(item.price))}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-coffee-400">{item.description}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          onClick={() => toggleAvailable(item)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                            item.is_available ? 'bg-success-500/10 text-success-600' : 'bg-coffee-100 text-coffee-400'
                          }`}
                        >
                          {item.is_available ? 'Available' : 'Sold out'}
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => { setEditingItem(item); setShowForm(true); }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-coffee-50 text-coffee-500 transition-colors hover:bg-coffee-100"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-coffee-50 text-coffee-400 transition-colors hover:bg-error-50 hover:text-error-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <MenuItemForm
          cafeId={cafeId}
          item={editingItem}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); onReload(); }}
        />
      )}

      {/* Delete confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-coffee-900/40 backdrop-blur-sm" onClick={() => setDeletingItem(null)}>
          <div className="animate-slide-up mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-error-500/10 text-error-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-semibold text-coffee-900">Delete menu item?</h3>
              <p className="mt-1 text-sm text-coffee-400">"{deletingItem.name}" will be permanently removed from your menu.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeletingItem(null)} className="flex-1 rounded-xl border border-coffee-200 bg-cream-50 py-3 text-sm font-semibold text-coffee-600 transition-colors hover:bg-coffee-100">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 rounded-xl bg-error-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-error-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemForm({ cafeId, item, onClose, onSaved }: { cafeId: string; item: MenuItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price?.toString() || '');
  const [category, setCategory] = useState(item?.category || 'Coffee');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim() || !price.trim()) {
      setError('Name and price are required');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Price must be a valid positive number');
      return;
    }
    setError('');
    setSaving(true);

    const payload = {
      cafe_id: cafeId,
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      category: category.trim() || 'Other',
      image_url: imageUrl.trim(),
      is_available: isAvailable,
    };

    let success = false;
    if (item) {
      const { error: updateError } = await supabase.from('menu_items').update(payload).eq('id', item.id);
      if (updateError) setError('Failed to update item. Please try again.');
      else success = true;
    } else {
      const { error: insertError } = await supabase.from('menu_items').insert(payload);
      if (insertError) setError('Failed to add item. Please try again.');
      else success = true;
    }

    setSaving(false);
    if (success) onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/40 backdrop-blur-sm sm:items-center" onClick={() => { if (!saving) onClose(); }}>
      <div className="animate-slide-up max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-coffee-900">{item ? 'Edit Item' : 'Add Menu Item'}</h2>
          <button onClick={onClose} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-full bg-coffee-50 text-coffee-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Flat White"
              className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Double ristretto with silky steamed milk" rows={2}
              className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Price (RM)</label>
              <input type="number" step="0.50" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12.00"
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Category</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Coffee"
                className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-coffee-400">Image URL</label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..."
              className="w-full rounded-xl border border-coffee-200 bg-cream-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20" />
          </div>
          <button onClick={() => setIsAvailable(!isAvailable)}
            className={`flex w-full items-center justify-between rounded-xl border p-3.5 transition-all ${isAvailable ? 'border-success-500/30 bg-success-500/10' : 'border-coffee-200 bg-cream-50'}`}>
            <span className={`text-sm font-semibold ${isAvailable ? 'text-success-600' : 'text-coffee-400'}`}>{isAvailable ? 'Available' : 'Sold out'}</span>
            <div className={`h-5 w-10 rounded-full p-0.5 transition-colors ${isAvailable ? 'bg-success-500' : 'bg-coffee-200'}`}>
              <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isAvailable ? 'translate-x-5' : ''}`} />
            </div>
          </button>

          {error && <p className="text-sm font-medium text-error-500">{error}</p>}

          <button onClick={handleSave} disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-coffee-900 py-3.5 text-sm font-semibold text-cream-50 transition-all hover:bg-coffee-800 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> {item ? 'Save Changes' : 'Add Item'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
