import { useState, useRef } from 'react';
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

const SWIPE_THRESHOLD = 75; // px distance to trigger swipe action
const MAX_SWIPE = 150; // max clamped visual drag

function TaskItem({ task, currentUser, allAssignees = [], activeTeam, onToggleTask, onDeleteTask, onEditTask }) {
  const [expanded, setExpanded] = useState(false);
  const [actionError, setActionError] = useState('');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    isSwiping: false,
    directionDecided: false,
    pointerId: null,
  });
  const justSwipedRef = useRef(false);

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

  // Pointer event handlers for gesture-driven swipe actions
  const handlePointerDown = (e) => {
    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // Don't drag if tapping interactive buttons or inputs
    if (e.target.closest('button, input, textarea, a, [data-no-swipe]')) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      isSwiping: false,
      directionDecided: false,
      pointerId: e.pointerId,
    };
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (drag.pointerId === null || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.directionDecided) {
      // If predominantly vertical movement, release to allow standard page scrolling
      if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) {
        drag.pointerId = null;
        return;
      }
      // If horizontal movement crosses threshold, lock into swipe gesture
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
        drag.directionDecided = true;
        drag.isSwiping = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    }

    if (drag.isSwiping) {
      // Elastic resistance beyond threshold
      let offset = dx;
      if (offset > SWIPE_THRESHOLD) {
        offset = SWIPE_THRESHOLD + (offset - SWIPE_THRESHOLD) * 0.35;
      } else if (offset < -SWIPE_THRESHOLD) {
        offset = -SWIPE_THRESHOLD + (offset + SWIPE_THRESHOLD) * 0.35;
      }
      offset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, offset));
      setSwipeOffset(offset);
    }
  };

  const handlePointerUp = (e) => {
    const drag = dragRef.current;
    if (drag.pointerId === null) return;

    if (drag.isSwiping) {
      justSwipedRef.current = true;
      setTimeout(() => {
        justSwipedRef.current = false;
      }, 200);

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }

      setIsDragging(false);

      if (swipeOffset >= SWIPE_THRESHOLD) {
        // Swiped right past threshold -> complete
        setIsCompleting(true);
        setSwipeOffset(window.innerWidth || 320);
        setTimeout(() => {
          markDone();
          setIsCompleting(false);
          setSwipeOffset(0);
        }, 220);
      } else if (swipeOffset <= -SWIPE_THRESHOLD) {
        // Swiped left past threshold -> delete
        setIsDeleting(true);
        setSwipeOffset(-(window.innerWidth || 320));
        setTimeout(() => {
          removeTask();
        }, 260);
      } else {
        // Snap back to resting state
        setSwipeOffset(0);
      }
    }

    drag.pointerId = null;
    drag.isSwiping = false;
    drag.directionDecided = false;
  };

  const handlePointerCancel = (e) => {
    const drag = dragRef.current;
    if (drag.pointerId !== null) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    }
    drag.pointerId = null;
    drag.isSwiping = false;
    drag.directionDecided = false;
    setIsDragging(false);
    setSwipeOffset(0);
  };

  const nextDue = task.lastCompleted
    ? getNextDue(task.lastCompleted, task.frequency)
    : null;

  // Swipe visual state calculations
  const isPastRight = swipeOffset >= SWIPE_THRESHOLD;
  const isPastLeft = swipeOffset <= -SWIPE_THRESHOLD;
  const swipeProgress = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);

  if (isDeleting) {
    return (
      <div className="overflow-hidden transition-all duration-300 ease-out max-h-0 opacity-0 my-0 py-0" />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl select-none group touch-pan-y">
      {/* Underlying Reveal Background for Swipe Actions */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden flex items-stretch">
        {/* Right Swipe: Complete (Green) */}
        {swipeOffset > 0 && (
          <div
            className={`w-full flex items-center justify-start pl-5 sm:pl-7 text-white transition-colors duration-150 ${
              isPastRight ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-emerald-700/80 dark:bg-emerald-700'
            }`}
          >
            <div
              className="flex items-center gap-2.5 font-bold transition-transform duration-100"
              style={{ transform: `scale(${0.8 + swipeProgress * 0.3})` }}
            >
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs">
                <Check size={22} strokeWidth={3} className="text-white" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                {isPastRight ? 'Release to Complete' : 'Swipe to Complete'}
              </span>
            </div>
          </div>
        )}

        {/* Left Swipe: Delete (Red) */}
        {swipeOffset < 0 && (
          <div
            className={`w-full flex items-center justify-end pr-5 sm:pr-7 text-white transition-colors duration-150 ${
              isPastLeft ? 'bg-rose-600 dark:bg-rose-500' : 'bg-rose-700/80 dark:bg-rose-700'
            }`}
          >
            <div
              className="flex items-center gap-2.5 font-bold transition-transform duration-100"
              style={{ transform: `scale(${0.8 + swipeProgress * 0.3})` }}
            >
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                {isPastLeft ? 'Release to Delete' : 'Swipe to Delete'}
              </span>
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs">
                <Trash2 size={20} strokeWidth={2.5} className="text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Foreground Task Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={() => {
          if (justSwipedRef.current) return;
          setExpanded(!expanded);
        }}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.18, 0.89, 0.32, 1.15)',
        }}
        className={`relative z-10 rounded-2xl sm:rounded-3xl border transition-colors duration-200 cursor-pointer ${
          overdue
            ? 'border-red-300 dark:border-red-900/80 bg-red-50/30 dark:bg-red-950/20 shadow-xs'
            : isDone
            ? 'border-slate-200/80 dark:border-[#213630]/60 bg-slate-50/80 dark:bg-[#111B18]/70 opacity-65 hover:opacity-95 shadow-none'
            : isCompleting
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md'
            : 'bg-white dark:bg-[#15221E] border-emerald-100 dark:border-[#213630] hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-md'
        }`}
      >
        {/* Priority indicator bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 sm:w-2 ${isDone ? 'bg-slate-300 dark:bg-slate-700' : priority.bar}`} />

        <div className="pl-4 pr-3 sm:pl-6 sm:pr-5 py-3.5 sm:py-4.5 flex flex-col gap-3">
          {/* Main Touch-Optimized Row */}
          <div className="flex items-center justify-between gap-3 min-w-0">
            {/* Left: Quick Tap Circle (44x44 Touch Target) + Task Content Hierarchy */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {/* Primary Touch Tap Target Check Circle */}
              <button
                type="button"
                aria-label={isDone ? 'Mark task incomplete' : 'Mark task complete'}
                className={`shrink-0 min-h-[44px] min-w-[44px] h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50/70 dark:bg-[#1C2C27] text-transparent hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  markDone();
                }}
                title={isDone ? 'Mark completed again' : 'Mark completed'}
              >
                <Check size={20} strokeWidth={3} className={isDone ? 'text-white' : 'currentColor'} />
              </button>

              {/* Task Details Hierarchy */}
              <div className="flex flex-col min-w-0 flex-1 py-0.5">
                {/* Top Line: Title + Overdue Pill */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span
                    className={`text-base sm:text-lg font-bold leading-tight tracking-tight break-words truncate ${
                      isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-teal-950 dark:text-[#F0FDF4]'
                    }`}
                  >
                    {task.name}
                  </span>
                  {overdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shrink-0">
                      <AlertCircle size={12} strokeWidth={2.5} />
                      <span>Overdue</span>
                    </span>
                  )}
                </div>

                {/* Bottom Line: Structured Scannable Metadata Badges */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
                  {/* Priority Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold border ${
                      isDone
                        ? 'bg-slate-100 dark:bg-[#1C2C27] text-slate-400 border-slate-200 dark:border-[#253D36]'
                        : `${priority.bg} ${priority.color} ${priority.border}`
                    }`}
                  >
                    {priority.label}
                  </span>

                  {/* Room Pill */}
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-md border text-[11px] sm:text-xs ${
                      isDone
                        ? 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1C2C27] border-slate-200 dark:border-[#253D36]'
                        : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1C2C27] border-emerald-100/80 dark:border-[#253D36]'
                    }`}
                  >
                    {task.room}
                  </span>

                  {/* Frequency */}
                  <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                    {FREQ_LABELS[task.frequency] || task.frequency}
                  </span>

                  {/* Due Date Indicator */}
                  {task.dueDate && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-md ${
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

                  {/* Assignee Avatar */}
                  {assignee && (
                    <div
                      className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-[#15221E] shadow-xs overflow-hidden inline-flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 ml-0.5"
                      title={`Assigned to ${assignee.name || 'Unknown'}`}
                    >
                      {assignee.photoURL ? (
                        <img src={assignee.photoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        assignee.name?.[0] || '?'
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {task.tags?.map((t) => (
                    <span
                      key={t}
                      className="bg-slate-100 dark:bg-[#1C2C27] text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[11px]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Touch Controls & Quick Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Desktop Done button */}
              <button
                type="button"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 active:scale-95 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
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
                <Check size={16} strokeWidth={3} className={isDone ? 'text-emerald-600 dark:text-emerald-400 group-hover:text-white' : 'text-white'} />
                <span>{isDone ? 'Done' : 'Mark Done'}</span>
              </button>

              {/* Edit button with minimum 44px tap target */}
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-[#1C2C27] active:scale-95 rounded-xl transition-all cursor-pointer"
                title="Edit task"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditTask) {
                    onEditTask(task);
                  }
                }}
              >
                <Pencil size={17} strokeWidth={2} />
              </button>

              {/* Delete button with minimum 44px tap target */}
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 rounded-xl transition-all cursor-pointer"
                title="Delete task (or swipe left)"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTask();
                }}
              >
                <Trash2 size={17} strokeWidth={2} />
              </button>

              {/* Chevron expand button with minimum 44px tap target */}
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer"
                title={expanded ? 'Collapse details' : 'Expand details'}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? <ChevronUp size={18} strokeWidth={2.5} /> : <ChevronDown size={18} strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          {/* Expanded Details Section */}
          {expanded && (
            <div
              data-no-swipe="true"
              className="pt-3.5 mt-0.5 border-t border-slate-100 dark:border-[#213630] flex flex-col gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {task.lastCompleted && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">Last Completed:</span>
                  <span>{formatCompletedAt(task.lastCompleted)}</span>
                  {task.lastCompletedByName && <span className="text-slate-400 dark:text-slate-400">by {task.lastCompletedByName}</span>}
                </div>
              )}

              {nextDue && task.frequency !== 'once' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">Next Due:</span>
                  <span>{formatCompletedAt(nextDue.getTime())}</span>
                </div>
              )}

              {task.notes && (
                <div className="flex flex-col gap-1 bg-slate-50 dark:bg-[#111B18] p-3 sm:p-3.5 rounded-xl border border-slate-100 dark:border-[#253D36]">
                  <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">Notes:</span>
                  <span className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{task.notes}</span>
                </div>
              )}

              {task.completionHistory?.length > 0 && (
                <div className="mt-1 flex flex-col gap-1.5">
                  <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">
                    Recent Completions ({task.completionHistory.length}):
                  </span>
                  <ul className="pl-4 list-disc text-xs sm:text-xs text-slate-500 dark:text-slate-400 space-y-1">
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
    </div>
  );
}

export default TaskItem;
