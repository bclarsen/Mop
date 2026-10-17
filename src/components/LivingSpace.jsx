import { useState, useMemo } from 'react';
import {
  Home,
  Plus,
  X,
  Sparkles,
  Utensils,
  Bath,
  Bed,
  Tv,
  Shirt,
  Laptop,
  Sun,
  Wrench,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isOverdue, isTaskDone, formatCompletedAt } from '../utils/dateHelpers';
import { getHealthStatus } from '../utils/healthHelpers';
import CleanlinessHealthRing from './CleanlinessHealthRing';

const ROOM_SUGGESTIONS = [
  'Kitchen',
  'Living Room',
  'Master Bedroom',
  'Guest Bathroom',
  'Home Office',
  'Laundry Room',
  'Patio / Deck',
  'Garage',
  'Dining Room',
  'Entryway',
];

function getRoomIcon(roomName = '') {
  const lower = roomName.toLowerCase();
  if (lower.includes('kitchen') || lower.includes('pantry') || lower.includes('dining') || lower.includes('cook')) {
    return Utensils;
  }
  if (lower.includes('bath') || lower.includes('toilet') || lower.includes('shower') || lower.includes('powder') || lower.includes('washroom')) {
    return Bath;
  }
  if (lower.includes('bed') || lower.includes('nursery') || lower.includes('bunk') || lower.includes('guest room')) {
    return Bed;
  }
  if (lower.includes('living') || lower.includes('lounge') || lower.includes('den') || lower.includes('family') || lower.includes('tv')) {
    return Tv;
  }
  if (lower.includes('laundry') || lower.includes('mud') || lower.includes('utility') || lower.includes('closet')) {
    return Shirt;
  }
  if (lower.includes('office') || lower.includes('study') || lower.includes('desk') || lower.includes('studio')) {
    return Laptop;
  }
  if (lower.includes('patio') || lower.includes('balcony') || lower.includes('garden') || lower.includes('yard') || lower.includes('deck') || lower.includes('porch')) {
    return Sun;
  }
  if (lower.includes('garage') || lower.includes('shed') || lower.includes('workshop') || lower.includes('basement')) {
    return Wrench;
  }
  return Home;
}

function LivingSpace({ rooms = [], workspace, tasks = [], user, onNavigateToRoom }) {
  const [newRoom, setNewRoom] = useState('');
  const [roomFilter, setRoomFilter] = useState('all'); // 'all' | 'needs-attention' | 'sparkling'
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAddRoom = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newRoom.trim();
    if (!trimmed || rooms.includes(trimmed)) return;

    try {
      if (workspace && !user?.isDemo) {
        const roomRef = doc(db, 'workspaces', workspace);
        const updatedRooms = [...rooms, trimmed];
        await setDoc(roomRef, { rooms: updatedRooms }, { merge: true });
      }
      setNewRoom('');
    } catch (err) {
      console.error('Error adding room:', err);
    }
  };

  const handleAddSuggestedRoom = async (suggested) => {
    if (rooms.includes(suggested)) return;
    try {
      if (workspace && !user?.isDemo) {
        const roomRef = doc(db, 'workspaces', workspace);
        const updatedRooms = [...rooms, suggested];
        await setDoc(roomRef, { rooms: updatedRooms }, { merge: true });
      }
    } catch (err) {
      console.error('Error adding suggested room:', err);
    }
  };

  const handleDeleteRoom = async (roomToDelete) => {
    if (rooms.length <= 1) return;
    try {
      if (workspace && !user?.isDemo) {
        const roomRef = doc(db, 'workspaces', workspace);
        const updatedRooms = rooms.filter((r) => r !== roomToDelete);
        await setDoc(roomRef, { rooms: updatedRooms }, { merge: true });
      }
      setConfirmDelete(null);
    } catch (err) {
      console.error('Error deleting room:', err);
    }
  };

  // Compute room health metrics
  const roomStats = useMemo(() => {
    return rooms.map((room) => {
      const roomTasks = tasks.filter((t) => (t.room || 'Other') === room);
      const total = roomTasks.length;
      const completed = roomTasks.filter(isTaskDone).length;
      const overdue = roomTasks.filter(isOverdue).length;
      const pending = roomTasks.filter((t) => !isTaskDone(t)).length;

      // Find the most recent completion in this room
      let lastCleanedAt = null;
      roomTasks.forEach((t) => {
        if (t.lastCompleted && (!lastCleanedAt || t.lastCompleted > lastCleanedAt)) {
          lastCleanedAt = t.lastCompleted;
        }
      });

      const status = getHealthStatus(total, completed, overdue);

      return {
        room,
        total,
        completed,
        overdue,
        pending,
        lastCleanedAt,
        status,
        tasks: roomTasks,
      };
    });
  }, [rooms, tasks]);

  // Overall Home Cleanliness summary
  const overallStats = useMemo(() => {
    const totalChores = tasks.length;
    const totalCompleted = tasks.filter(isTaskDone).length;
    const totalOverdue = tasks.filter(isOverdue).length;
    const sparklingRoomsCount = roomStats.filter((r) => r.status.tone === 'sparkling').length;
    const attentionRoomsCount = roomStats.filter(
      (r) => r.status.tone === 'attention' || r.status.tone === 'urgent'
    ).length;

    const overallStatus = getHealthStatus(totalChores, totalCompleted, totalOverdue);

    return {
      totalChores,
      totalCompleted,
      totalOverdue,
      sparklingRoomsCount,
      attentionRoomsCount,
      overallStatus,
    };
  }, [tasks, roomStats]);

  const filteredRoomStats = useMemo(() => {
    if (roomFilter === 'needs-attention') {
      return roomStats.filter(
        (r) => r.status.tone === 'attention' || r.status.tone === 'urgent'
      );
    }
    if (roomFilter === 'sparkling') {
      return roomStats.filter((r) => r.status.tone === 'sparkling' || r.status.tone === 'fresh');
    }
    return roomStats;
  }, [roomStats, roomFilter]);

  const unusedSuggestions = ROOM_SUGGESTIONS.filter((s) => !rooms.includes(s)).slice(0, 5);

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight flex items-center gap-2.5">
            <span>Living Space</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time cleanliness health scores, overdue chores, and hygiene ratings for every room.
          </p>
        </div>
      </div>

      {/* Overall Home Cleanliness Health Ring Banner */}
      <div className="bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 dark:from-[#15221E] dark:via-[#182823] dark:to-[#121E1A] border border-emerald-200/90 dark:border-[#253D36] rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <CleanlinessHealthRing
            totalTasks={overallStats.totalChores}
            completedTasks={overallStats.totalCompleted}
            overdueTasks={overallStats.totalOverdue}
            size={90}
            strokeWidth={7}
            uniqueId="home-overall"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Overall Home Cleanliness
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${overallStats.overallStatus.bgClass}`}>
                <overallStats.overallStatus.Icon size={12} strokeWidth={2.5} />
                <span>{overallStats.overallStatus.label}</span>
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight mt-1">
              {overallStats.overallStatus.percentage === 100
                ? 'Your entire living space is spotless!'
                : overallStats.overallStatus.percentage >= 70
                ? 'Home is in great shape today.'
                : 'A few areas need some attention.'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {overallStats.totalCompleted} of {overallStats.totalChores} chores completed
              {overallStats.totalOverdue > 0 ? ` · ${overallStats.totalOverdue} overdue` : ''}
            </p>
          </div>
        </div>

        {/* Quick Room Health Summary Badges */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-emerald-100 dark:border-[#253D36]">
          <div className="flex flex-col items-center justify-center px-4 py-2.5 bg-white/80 dark:bg-[#1C2C27]/80 border border-emerald-100 dark:border-[#253D36] rounded-2xl">
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {overallStats.sparklingRoomsCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sparkling</span>
          </div>

          <div className="flex flex-col items-center justify-center px-4 py-2.5 bg-white/80 dark:bg-[#1C2C27]/80 border border-emerald-100 dark:border-[#253D36] rounded-2xl">
            <span className={`text-xl font-extrabold tabular-nums ${overallStats.attentionRoomsCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {overallStats.attentionRoomsCount}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Needs Care</span>
          </div>

          <div className="flex flex-col items-center justify-center px-4 py-2.5 bg-white/80 dark:bg-[#1C2C27]/80 border border-emerald-100 dark:border-[#253D36] rounded-2xl">
            <span className="text-xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tabular-nums">
              {rooms.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Rooms</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Add Room Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-xl self-start">
          <button
            type="button"
            onClick={() => setRoomFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              roomFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            All Spaces ({roomStats.length})
          </button>
          <button
            type="button"
            onClick={() => setRoomFilter('needs-attention')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              roomFilter === 'needs-attention'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <span>Needs Attention</span>
            {overallStats.attentionRoomsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 text-amber-900 font-extrabold">
                {overallStats.attentionRoomsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setRoomFilter('sparkling')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              roomFilter === 'sparkling'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            Sparkling ({overallStats.sparklingRoomsCount})
          </button>
        </div>

        {/* Add Room Form */}
        <form onSubmit={handleAddRoom} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add custom room..."
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            className="px-3.5 py-2 bg-white dark:bg-[#1C2C27] border border-emerald-200 dark:border-[#253D36] rounded-xl text-xs text-slate-800 dark:text-[#F0FDF4] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs min-w-[200px]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            disabled={!newRoom.trim()}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Suggested Quick Add Chips */}
      {unusedSuggestions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-[11px] text-slate-400">Quick add:</span>
          {unusedSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleAddSuggestedRoom(suggestion)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#1C2C27] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200/80 dark:border-[#253D36] rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Plus size={11} strokeWidth={2.5} />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Room Cards Grid with Cleanliness Health Rings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoomStats.map((item, idx) => {
          const RoomIcon = getRoomIcon(item.room);
          const isDeleting = confirmDelete === item.room;

          return (
            <div
              key={item.room}
              className="bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top Row: Icon, Room Name, and Health Ring */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-[#1C2C27] text-emerald-700 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <RoomIcon size={20} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-teal-950 dark:text-[#F0FDF4] text-base tracking-tight truncate">
                      {item.room}
                    </h3>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${item.status.bgClass}`}>
                        <item.status.Icon size={11} strokeWidth={2.5} />
                        <span>{item.status.label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Circular Cleanliness Health Ring */}
                <div className="shrink-0">
                  <CleanlinessHealthRing
                    totalTasks={item.total}
                    completedTasks={item.completed}
                    overdueTasks={item.overdue}
                    size={64}
                    strokeWidth={5}
                    uniqueId={`room-ring-${idx}`}
                  />
                </div>
              </div>

              {/* Middle Section: Chores & Status Breakdown */}
              <div className="my-4 pt-3 border-t border-slate-100 dark:border-[#213630] flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-[#1C2C27]/60 border border-slate-100 dark:border-[#253D36]">
                    <span className="block text-xs font-extrabold text-teal-950 dark:text-[#F0FDF4] tabular-nums">
                      {item.total}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Chores</span>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                    <span className="block text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {item.completed}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80 uppercase">Done</span>
                  </div>

                  <div className={`p-2 rounded-xl border ${
                    item.overdue > 0
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40'
                      : 'bg-slate-50/80 dark:bg-[#1C2C27]/60 border-slate-100 dark:border-[#253D36]'
                  }`}>
                    <span className={`block text-xs font-extrabold tabular-nums ${
                      item.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {item.overdue > 0 ? item.overdue : item.pending}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase ${
                      item.overdue > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'
                    }`}>
                      {item.overdue > 0 ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                </div>

                {item.lastCleanedAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    <span>Last cleaned {formatCompletedAt(item.lastCleanedAt)}</span>
                  </div>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#213630]">
                {onNavigateToRoom ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToRoom(item.room)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors cursor-pointer group/btn"
                  >
                    <span>View Chores ({item.total})</span>
                    <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">{item.total} Tasks</span>
                )}

                {rooms.length > 1 && (
                  <div>
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5 animate-fade-in">
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(item.room)}
                          className="px-2 py-1 text-[10px] font-extrabold bg-rose-600 text-white rounded-md hover:bg-rose-700 cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-200 dark:bg-[#1C2C27] text-slate-700 dark:text-slate-300 rounded-md cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove room"
                        onClick={() => setConfirmDelete(item.room)}
                      >
                        <X size={15} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRoomStats.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed border-emerald-200 dark:border-[#253D36] bg-white/70 dark:bg-[#15221E]/70 rounded-3xl">
          <div className="p-3 bg-emerald-50 dark:bg-[#1C2C27] text-emerald-600 dark:text-emerald-400 rounded-2xl inline-flex mb-3">
            <Sparkles size={24} strokeWidth={2} />
          </div>
          <h3 className="text-sm font-bold text-teal-950 dark:text-[#F0FDF4] mb-1">No spaces matching this filter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Switch filter to "All Spaces" to see all rooms.</p>
        </div>
      )}
    </div>
  );
}

export default LivingSpace;
