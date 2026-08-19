import { useState, useEffect } from 'react';
import { History as HistoryIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatCompletedAt, formatDueDate } from '../utils/dateHelpers';

const historyRef = collection(db, 'taskHistory');

function History({ user, workspace, tasks = [] }) {
  const [firestoreItems, setFirestoreItems] = useState([]);
  const [loading, setLoading] = useState(!user?.isDemo && !!user && !!workspace);

  // Derived demo items when running in guest/demo mode
  const demoItems = (() => {
    if (!user?.isDemo || !workspace) return [];
    const demoHistory = [];
    const currentWorkspaceTasks = tasks.filter((t) => {
      if (workspace === 'personal') {
        return !t.workspace || t.workspace === 'personal';
      }
      return t.workspace === workspace;
    });

    currentWorkspaceTasks.forEach((t) => {
      (t.completionHistory || []).forEach((ch) => {
        demoHistory.push({
          id: `${t.id}-${ch.completedAt}`,
          taskId: t.id,
          taskName: t.name,
          room: t.room,
          priority: t.priority,
          frequency: t.frequency,
          ...ch,
        });
      });
    });
    demoHistory.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    return demoHistory;
  })();

  const historyItems = user?.isDemo ? demoItems : firestoreItems;

  useEffect(() => {
    if (!user || !workspace || user.isDemo) {
      return;
    }

    const q = workspace === 'personal'
      ? query(
          historyRef,
          where('workspace', '==', 'personal'),
          where('ownerUid', '==', user.uid),
          orderBy('completedAt', 'desc'),
        )
      : query(
          historyRef,
          where('workspace', '==', workspace),
          orderBy('completedAt', 'desc'),
        );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setFirestoreItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.warn('History snapshot fallback:', err);
        setLoading(false);
      },
    );

    return unsub;
  }, [user, workspace]);

  return (
    <div className="px-4 md:px-8 py-6 w-full max-w-4xl mx-auto flex flex-col items-center animate-fade-in">
      <div className="w-full mb-6 text-left">
        <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight">Cleaning History Log</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Permanent record of completed household chores and room maintenance.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">Loading history logs...</div>
      ) : historyItems.length === 0 ? (
        <div className="w-full text-center py-16 px-4 border border-dashed border-emerald-200 dark:border-[#253D36] bg-white/60 dark:bg-[#15221E]/60 rounded-3xl transition-colors">
          <div className="p-3 bg-emerald-50 dark:bg-[#1C2C27] text-emerald-600 dark:text-emerald-400 rounded-2xl inline-flex mb-3">
            <HistoryIcon size={28} strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-bold text-teal-950 dark:text-[#F0FDF4] mb-1">No completed chores yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Completed tasks will log here automatically with timestamps.</p>
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-[#15221E] border border-emerald-100/90 dark:border-[#213630] rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-[#213630] transition-colors">
          {historyItems.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50/70 dark:hover:bg-[#1C2C27]/70 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0">
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-teal-950 dark:text-[#F0FDF4] text-sm truncate">{item.taskName || 'Chore'}</span>
                    {item.room && (
                      <span className="text-[11px] font-semibold bg-emerald-50 dark:bg-[#1C2C27] text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-[#253D36]">
                        {item.room}
                      </span>
                    )}
                    {item.wasLate && (
                      <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <AlertCircle size={11} /> Completed Late
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                    Completed by <strong className="text-slate-600 dark:text-slate-200 font-semibold">{item.completedByName || 'Guest'}</strong> on {formatCompletedAt(item.completedAt)}
                  </span>
                </div>
              </div>

              {item.dueAt && (
                <div className="text-right shrink-0 hidden sm:block">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> Was due {formatDueDate(item.dueAt)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;
