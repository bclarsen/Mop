import { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyTaskCompletion } from '../utils/notificationService';
import {
  formatCompletedAt,
  formatDueDate,
  getNextDue,
  hasDueTime,
  isOverdue,
  isTaskDone,
  parseDueDate,
} from '../utils/dateHelpers';

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-orange-900 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/60', border: 'border-orange-200 dark:border-orange-800', bar: 'bg-orange-600' },
  medium: { label: 'Medium', color: 'text-stone-700 dark:text-stone-300', bg: 'bg-stone-100 dark:bg-stone-900/60', border: 'border-stone-200 dark:border-stone-700', bar: 'bg-stone-400' },
  low: { label: 'Low', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/60', border: 'border-slate-200 dark:border-slate-700', bar: 'bg-slate-300' },
};

const FREQ_LABELS = {
  once: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

function TaskItem({ task, currentUser, allAssignees = [], activeTeam, onToggleTask, onDeleteTask, onEditTask }) {
  const [expanded, setExpanded] = useState(false);
  const [actionError, setActionError] = useState('');
  const assignee = allAssignees.find((a) => a.uid === task.assignedTo);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task);
  const isDone = isTaskDone(task);

  const markDone = async () => {
    setActionError('');
    const now = Date.now();
    const completion = {
      completedAt: now,
      completedBy: currentUser?.uid || 'guest-user',
      completedByName: currentUser?.displayName || 'Guest',
      dueAt: task.dueDate || null,
      wasLate: task.dueDate ? now > parseDueDate(task.dueDate).getTime() : null,
    };
    try {
      if (!currentUser?.isDemo) {
        await updateDoc(doc(db, 'tasks', task.id), {
          lastCompleted: now,
          lastCompletedBy: currentUser.uid,
          lastCompletedByName: currentUser.displayName,
          completionHistory: arrayUnion(completion),
        });

        if (task.workspace !== 'personal' && activeTeam) {
          notifyTaskCompletion({
            user: currentUser,
            workspace: task.workspace,
            activeTeam: activeTeam,
            allAssignees: allAssignees,
            task: task,
          });
        }
      }
      if (onToggleTask) {
        onToggleTask(task.id, completion);
      }
    } catch (err) {
      console.warn('Error completing task in Firestore, updating locally:', err);
      if (onToggleTask) {
        onToggleTask(task.id, completion);
      }
    }

    try {
      if (!currentUser?.isDemo) {
        await addDoc(collection(db, 'taskHistory'), {
          ...completion,
          taskId: task.id,
          taskName: task.name,
          room: task.room || 'Other',
          priority: task.priority || 'medium',
          frequency: task.frequency || 'once',
          workspace: task.workspace || 'personal',
          ownerUid: task.ownerUid || currentUser.uid,
        });
      }
    } catch (err) {
      console.warn('Error storing permanent task history:', err);
    }
  };

  const removeTask = async () => {
    setActionError('');
    try {
      if (!currentUser?.isDemo) {
        await deleteDoc(doc(db, 'tasks', task.id));
      }
      if (onDeleteTask) {
        onDeleteTask(task.id);
      }
    } catch (err) {
      console.warn('Error deleting task in Firestore, deleting locally:', err);
      if (onDeleteTask) {
        onDeleteTask(task.id);
      }
    }
  };

  const nextDue = task.lastCompleted
    ? getNextDue(task.lastCompleted, task.frequency)
    : null;

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
        overdue
          ? 'border-red-300 dark:border-red-900/80 bg-red-50/20 dark:bg-red-950/20 shadow-xs'
          : isDone
          ? 'border-slate-200/80 dark:border-[#213630]/60 bg-slate-50/75 dark:bg-[#111B18]/60 opacity-60 hover:opacity-95 shadow-none'
          : 'bg-white dark:bg-[#15221E] border-emerald-100 dark:border-[#213630] hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-md'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Priority indicator strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDone ? 'bg-slate-300 dark:bg-slate-700' : priority.bar}`} />

      <div className="pl-4.5 pr-4 py-3.5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Task Info */}
          <div className="flex flex-col min-w-0 pr-2">
            <span className={`text-sm font-bold truncate leading-snug ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-teal-950 dark:text-[#F0FDF4]'}`}>
              {task.name}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-400 mt-1 flex-wrap">
              <span className={`font-semibold px-2 py-0.5 rounded-md border ${
                isDone
                  ? 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1C2C27] border-slate-200 dark:border-[#253D36]'
                  : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1C2C27] border-emerald-100/80 dark:border-[#253D36]'
              }`}>
                {task.room}
              </span>
              <span>·</span>
              <span className="font-medium text-slate-500 dark:text-slate-400">
                {FREQ_LABELS[task.frequency] || task.frequency}
              </span>
              {task.tags?.map((t) => (
                <span key={t} className="bg-slate-100 dark:bg-[#1C2C27] text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[11px]">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Actions & Badges */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${isDone ? 'bg-slate-100 dark:bg-[#1C2C27] text-slate-400 border-slate-200 dark:border-[#253D36]' : `${priority.bg} ${priority.color} ${priority.border}`}`}>
              {priority.label}
            </span>

            {assignee && (
              <div
                className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-[#15221E] shadow-xs overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200"
                title={`Assigned to ${assignee.name || 'Unknown'}`}
              >
                {assignee.photoURL ? (
                  <img src={assignee.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  assignee.name?.[0] || '?'
                )}
              </div>
            )}

            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                  overdue
                    ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 font-bold'
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#1C2C27]'
                }`}
                title={`Due ${formatDueDate(task.dueDate)}`}
              >
                {hasDueTime(task.dueDate) ? (
                  <Clock size={12} strokeWidth={2} />
                ) : (
                  <Calendar size={12} strokeWidth={2} />
                )}
                <span>{formatDueDate(task.dueDate)}</span>
              </span>
            )}

            {overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                <AlertCircle size={11} strokeWidth={2.5} />
                Overdue
              </span>
            )}

            <button
              className={`inline-flex items-center gap-1 px-3 py-1.5 active:scale-95 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                isDone
                  ? 'bg-slate-100 dark:bg-[#1C2C27] hover:bg-emerald-600 text-slate-500 dark:text-slate-300 hover:text-white border border-slate-200 dark:border-[#253D36] hover:border-emerald-600'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                markDone();
              }}
              title={isDone ? 'Mark completed again' : 'Mark completed'}
            >
              <Check size={13} strokeWidth={3} className={isDone ? 'text-emerald-600 dark:text-emerald-400 group-hover:text-white' : 'text-white'} />
              <span>Done</span>
            </button>

            <button
              type="button"
              className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-[#1C2C27] rounded-lg transition-colors cursor-pointer"
              title="Edit task"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditTask) {
                  onEditTask(task);
                }
              }}
            >
              <Pencil size={14} strokeWidth={2} />
            </button>

            <button
              className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              title="Delete task"
              onClick={(e) => {
                e.stopPropagation();
                removeTask();
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>

            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? <ChevronUp size={15} strokeWidth={2.5} /> : <ChevronDown size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div
            className="pt-3 mt-1 border-t border-slate-100 dark:border-[#213630] flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-300 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {task.lastCompleted && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">Last Completed:</span>
                <span>{formatCompletedAt(task.lastCompleted)}</span>
                {task.lastCompletedByName && <span className="text-slate-400 dark:text-slate-400">by {task.lastCompletedByName}</span>}
              </div>
            )}

            {nextDue && task.frequency !== 'once' && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">Next Due:</span>
                <span>{formatCompletedAt(nextDue.getTime())}</span>
              </div>
            )}

            {task.notes && (
              <div className="flex flex-col gap-0.5 bg-slate-50 dark:bg-[#111B18] p-2.5 rounded-xl border border-slate-100 dark:border-[#253D36]">
                <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">Notes:</span>
                <span className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{task.notes}</span>
              </div>
            )}

            {task.completionHistory?.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">
                  Recent Completions ({task.completionHistory.length}):
                </span>
                <ul className="pl-4 list-disc text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  {[...task.completionHistory]
                    .reverse()
                    .slice(0, 5)
                    .map((h, i) => (
                      <li key={i}>
                        {formatCompletedAt(h.completedAt)} — {h.completedByName || 'Guest'}
                        {h.wasLate && <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">(Late)</span>}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {actionError && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{actionError}</p>}
      </div>
    </div>
  );
}

export default TaskItem;
