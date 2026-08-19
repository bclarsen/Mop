import { useEffect, useMemo, useState } from 'react';
import { Award, Check, Medal, Trophy, TrendingUp, Layers } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatCompletedAt, isOverdue } from '../utils/dateHelpers';

const PODIUM = [
  { Icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/60', label: '1st place' },
  { Icon: Medal, color: 'text-slate-400 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-900/60', label: '2nd place' },
  { Icon: Award, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-950/40', label: '3rd place' },
];

function StatsPanel({ tasks, currentUser, workspace }) {
  const [historyEntries, setHistoryEntries] = useState([]);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!currentUser?.uid || !workspace) return;
    const historyQuery = workspace === 'personal'
      ? query(
          collection(db, 'taskHistory'),
          where('workspace', '==', 'personal'),
          where('ownerUid', '==', currentUser.uid),
        )
      : query(collection(db, 'taskHistory'), where('workspace', '==', workspace));

    return onSnapshot(
      historyQuery,
      (snapshot) => setHistoryEntries(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
      (error) => console.warn('Activity history fallback:', error),
    );
  }, [currentUser?.uid, workspace]);

  const totalTasks = tasks.length;
  const totalCompletions = tasks.reduce((sum, t) => sum + (t.completionHistory?.length || 0), 0);

  // Completions per person
  const byPerson = {};
  tasks.forEach((task) => {
    (task.completionHistory || []).forEach((h) => {
      const key = h.completedBy;
      if (!byPerson[key]) byPerson[key] = { name: h.completedByName || 'Unknown', count: 0 };
      byPerson[key].count++;
    });
  });

  // Completions per room
  const byRoom = {};
  tasks.forEach((task) => {
    const room = task.room || 'Other';
    if (!byRoom[room]) byRoom[room] = { total: 0, completions: 0 };
    byRoom[room].total++;
    byRoom[room].completions += (task.completionHistory?.length || 0);
  });

  const allCompletionEntries = useMemo(() => {
    const storedKeys = new Set(
      historyEntries.map((entry) => `${entry.taskId}:${entry.completedAt}`),
    );
    const legacyEntries = tasks.flatMap((task) =>
      (task.completionHistory || [])
        .filter((entry) => !storedKeys.has(`${task.id}:${entry.completedAt}`))
        .map((entry, index) => ({
          ...entry,
          id: `legacy-${task.id}-${entry.completedAt}-${index}`,
          taskName: task.name,
          room: task.room || 'Other',
        })),
    );
    return [...historyEntries, ...legacyEntries];
  }, [historyEntries, tasks]);

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentCompletions = allCompletionEntries
    .filter((entry) => entry.completedAt > sevenDaysAgo)
    .sort((a, b) => b.completedAt - a.completedAt);

  const overdueCount = tasks.filter(isOverdue).length;

  const sortedPeople = Object.entries(byPerson).sort((a, b) => b[1].count - a[1].count);
  const maxCount = sortedPeople[0]?.[1].count || 1;

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight">Household Stats & Leaderboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track contributions, room maintenance habits, and recent achievements.</p>
      </div>

      {/* Top 4 Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-2xl p-4 md:p-5 shadow-xs flex flex-col transition-colors">
          <span className="text-2xl md:text-3xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight leading-none">{totalTasks}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">Active Tasks</span>
        </div>

        <div className="bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-2xl p-4 md:p-5 shadow-xs flex flex-col transition-colors">
          <span className="text-2xl md:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight leading-none">{totalCompletions}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">Total Done</span>
        </div>

        <div className="bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-2xl p-4 md:p-5 shadow-xs flex flex-col transition-colors">
          <span className="text-2xl md:text-3xl font-extrabold text-teal-800 dark:text-emerald-300 tracking-tight leading-none">{recentCompletions.length}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">Done This Week</span>
        </div>

        <div className={`border rounded-2xl p-4 md:p-5 shadow-xs flex flex-col transition-colors ${
          overdueCount > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
            : 'bg-white dark:bg-[#15221E] border-emerald-100/90 dark:border-[#213630]'
        }`}>
          <span className={`text-2xl md:text-3xl font-extrabold tracking-tight leading-none ${overdueCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>
            {overdueCount}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">Overdue</span>
        </div>
      </div>

      {/* 2 Column Section: Leaderboard + By Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaderboard Card */}
        <div className="bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-2xl p-5 md:p-6 shadow-xs flex flex-col transition-colors">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#213630]">
            <h3 className="text-sm font-extrabold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              <span>Leaderboard</span>
            </h3>
          </div>

          {sortedPeople.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-6 text-center">No completions logged yet — check off tasks to climb the ranks!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedPeople.map(([uid, data], i) => {
                const podium = PODIUM[i];
                const PodiumIcon = podium?.Icon;
                return (
                  <div key={uid} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1C2C27] transition-colors">
                    <div className="w-7 text-center shrink-0 flex items-center justify-center">
                      {PodiumIcon ? (
                        <PodiumIcon size={18} className={podium.color} />
                      ) : (
                        <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500">#{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-teal-950 dark:text-[#F0FDF4] truncate">
                          {data.name}{uid === currentUser?.uid ? ' (You)' : ''}
                        </span>
                        <span className="font-extrabold text-emerald-800 dark:text-emerald-400 shrink-0 ml-2">{data.count} done</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-[#1C2C27] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(data.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By Room Card */}
        <div className="bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-2xl p-5 md:p-6 shadow-xs flex flex-col transition-colors">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#213630]">
            <h3 className="text-sm font-extrabold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Room Breakdown</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#213630] text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-2 font-bold">Room / Area</th>
                  <th className="pb-2 font-bold text-center">Tasks</th>
                  <th className="pb-2 font-bold text-right">Completions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#213630]">
                {Object.entries(byRoom).map(([room, data]) => (
                  <tr key={room} className="hover:bg-slate-50/60 dark:hover:bg-[#1C2C27]/60 transition-colors">
                    <td className="py-2.5 font-bold text-teal-950 dark:text-[#F0FDF4]">{room}</td>
                    <td className="py-2.5 text-center text-slate-600 dark:text-slate-300 font-semibold">{data.total}</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-400">{data.completions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity 7 Days */}
      <div className="bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-2xl p-5 md:p-6 shadow-xs flex flex-col transition-colors">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-[#213630]">
          <h3 className="text-sm font-extrabold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Recent Activity (Past 7 Days)</span>
          </h3>
        </div>

        {recentCompletions.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">Nothing completed in the last 7 days.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#213630] max-h-72 overflow-y-auto">
            {recentCompletions.slice(0, 20).map((h) => (
              <div key={h.id} className="py-2.5 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check size={14} strokeWidth={3} />
                </div>
                <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="font-bold text-teal-950 dark:text-[#F0FDF4] text-xs truncate">{h.taskName}</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400">· {h.room} · by <strong className="text-slate-600 dark:text-slate-300 font-semibold">{h.completedByName}</strong></span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{formatCompletedAt(h.completedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsPanel;
