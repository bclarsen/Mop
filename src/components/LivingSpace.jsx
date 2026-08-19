import { useState } from 'react';
import { Home, Plus, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

function LivingSpace({ rooms, workspace }) {
  const [newRoom, setNewRoom] = useState('');

  const handleAddRoom = async (e) => {
    e.preventDefault();
    const trimmed = newRoom.trim();
    if (!trimmed || rooms.includes(trimmed)) return;

    try {
      if (workspace) {
        const roomRef = doc(db, 'workspaces', workspace);
        const updatedRooms = [...rooms, trimmed];
        await setDoc(roomRef, { rooms: updatedRooms }, { merge: true });
      }
      setNewRoom('');
    } catch (err) {
      console.error('Error adding room:', err);
    }
  };

  const handleDeleteRoom = async (roomToDelete) => {
    if (rooms.length <= 1) return;
    try {
      if (workspace) {
        const roomRef = doc(db, 'workspaces', workspace);
        const updatedRooms = rooms.filter((r) => r !== roomToDelete);
        await setDoc(roomRef, { rooms: updatedRooms }, { merge: true });
      }
    } catch (err) {
      console.error('Error deleting room:', err);
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight">Living Spaces & Rooms</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Customize rooms to categorize and organize tasks across your home.</p>
        </div>
      </div>

      <form onSubmit={handleAddRoom} className="mb-6 flex flex-wrap gap-2.5 items-center">
        <input
          type="text"
          placeholder="New room name (e.g. Patio, Laundry, Balcony)"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          className="flex-1 min-w-[240px] px-4 py-2.5 bg-white dark:bg-[#1C2C27] border border-emerald-200 dark:border-[#253D36] rounded-xl text-sm text-slate-800 dark:text-[#F0FDF4] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:bg-[#111B18] shadow-xs"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          disabled={!newRoom.trim()}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Room
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {rooms.map((room) => (
          <div
            key={room}
            className="flex items-center justify-between p-4 bg-white dark:bg-[#15221E] border border-emerald-100 dark:border-[#213630] rounded-2xl shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-[#1C2C27] text-emerald-700 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Home size={18} strokeWidth={2} />
              </div>
              <span className="font-bold text-teal-950 dark:text-[#F0FDF4] text-sm">{room}</span>
            </div>
            {rooms.length > 1 && (
              <button
                className="p-1.5 rounded-lg text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                title="Remove room"
                onClick={() => handleDeleteRoom(room)}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LivingSpace;
