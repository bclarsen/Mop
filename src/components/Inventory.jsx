import { useState, useEffect } from 'react';
import { Plus, X, Minus, Package, Layers } from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const inventoryRef = collection(db, 'inventory');

const SAMPLE_INVENTORY = [
  { id: 'demo-inv-1', name: 'Paper Towels', quantity: 4, workspace: 'personal', addedByName: 'Guest Cleaner' },
  { id: 'demo-inv-2', name: 'Dishwasher Pods', quantity: 18, workspace: 'personal', addedByName: 'Guest Cleaner' },
  { id: 'demo-inv-3', name: 'Multi-Surface Cleaner', quantity: 2, workspace: 'personal', addedByName: 'Guest Cleaner' },
  { id: 'demo-inv-4', name: 'Trash Bags (13 Gallon)', quantity: 25, workspace: 'personal', addedByName: 'Guest Cleaner' },
];

function Inventory({ user, workspace }) {
  const [items, setItems] = useState(user?.isDemo ? SAMPLE_INVENTORY : []);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!user || user.isDemo || !workspace) return;
    const q = query(inventoryRef, where('workspace', '==', workspace));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setItems(fetched);
      },
      (err) => console.warn('Note: inventory snapshot fallback:', err?.code || err)
    );
    return unsub;
  }, [user, workspace]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const newItem = {
      name: itemName.trim(),
      quantity: Number(quantity) || 1,
      workspace,
      addedBy: user?.uid || 'guest-user',
      addedByName: user?.displayName || user?.email || 'Guest',
      createdAt: new Date(),
    };

    try {
      if (!user?.isDemo) {
        const docRef = await addDoc(inventoryRef, {
          ...newItem,
          createdAt: serverTimestamp(),
        });
        setItems((prev) => [{ id: docRef.id, ...newItem }, ...prev]);
      } else {
        setItems((prev) => [{ id: `demo-inv-${Date.now()}`, ...newItem }, ...prev]);
      }
    } catch (err) {
      console.warn('Error adding inventory item to Firestore, updating locally:', err);
      setItems((prev) => [{ id: `demo-inv-${Date.now()}`, ...newItem }, ...prev]);
    }

    setItemName('');
    setQuantity(1);
    setShowAddForm(false);
  };

  const handleUpdateQuantity = async (itemId, currentQty, delta) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      if (!user?.isDemo) {
        await updateDoc(doc(db, 'inventory', itemId), {
          quantity: newQty,
        });
      }
      setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, quantity: newQty } : it)));
    } catch (err) {
      console.warn('Error updating quantity in Firestore, updating locally:', err);
      setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, quantity: newQty } : it)));
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      if (!user?.isDemo) {
        await deleteDoc(doc(db, 'inventory', itemId));
      }
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    } catch (err) {
      console.warn('Error deleting item in Firestore, deleting locally:', err);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 tracking-tight">Household Supplies & Inventory</h2>
          <p className="text-sm text-slate-500 mt-0.5">Keep track of cleaning supplies, trash bags, and refills.</p>
        </div>

        {!showAddForm && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 self-start sm:self-auto"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Supply Item
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddItem} className="mb-6 p-5 bg-white border border-emerald-200 rounded-2xl shadow-sm animate-fade-in flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Item Name</label>
              <input
                type="text"
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                placeholder="e.g. Dish Soap, Microfiber Cloths"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Stock Count</label>
              <input
                type="number"
                min="0"
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-lg"
              onClick={() => {
                setShowAddForm(false);
                setItemName('');
                setQuantity(1);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              disabled={!itemName.trim()}
            >
              Save Item
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-emerald-200 bg-white/60 rounded-3xl">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl inline-flex mb-3">
            <Package size={28} strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-bold text-teal-950 mb-1">No supplies logged</h3>
          <p className="text-xs text-slate-500">Track paper towels, soaps, and detergent to stay stocked up.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const isLow = (item.quantity ?? 0) <= 2;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-white border border-emerald-100 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 ${isLow ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    <Layers size={18} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-teal-950 text-sm truncate">{item.name}</span>
                    {isLow && (
                      <span className="text-[11px] font-bold text-amber-600">Running low</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-0.5">
                    <button
                      className="p-1 rounded-lg text-slate-500 hover:text-teal-900 hover:bg-white transition-all disabled:opacity-30"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity || 0, -1)}
                      disabled={(item.quantity || 0) <= 0}
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className="font-extrabold text-xs text-teal-950 px-2.5 min-w-[28px] text-center">
                      {item.quantity ?? 0}
                    </span>
                    <button
                      className="p-1 rounded-lg text-slate-500 hover:text-teal-900 hover:bg-white transition-all"
                      onClick={() => handleUpdateQuantity(item.id, item.quantity || 0, 1)}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>

                  <button
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete item"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Inventory;
