import { UserCheck, ClipboardList, AlertCircle, Clock, ArrowRight, X } from 'lucide-react';
import { formatDueDate } from '../utils/dateHelpers';

function NotificationBanner({ notification, onNavigateToTask, onDismiss }) {
  if (!notification) return null;

  const isAssigned = notification.type === 'task_assigned';
  const isDueReminder = notification.type === 'due_date_reminder';
  const isOverdue = notification.isOverdue;

  return (
    <div className={`mx-4 md:mx-8 mt-3 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in ${
      isDueReminder
        ? isOverdue
          ? 'bg-amber-50/95 border-amber-300 text-amber-950'
          : 'bg-emerald-50/95 border-emerald-200 text-teal-950'
        : isAssigned
        ? 'bg-emerald-50/95 border-emerald-200 text-teal-950'
        : 'bg-sky-50/95 border-sky-200 text-sky-950'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl shadow-xs shrink-0 text-white ${
          isDueReminder
            ? isOverdue
              ? 'bg-amber-600'
              : 'bg-emerald-600'
            : isAssigned
            ? 'bg-emerald-600'
            : 'bg-sky-600'
        }`}>
          {isDueReminder ? (
            isOverdue ? (
              <AlertCircle size={18} strokeWidth={2.2} />
            ) : (
              <Clock size={18} strokeWidth={2.2} />
            )
          ) : isAssigned ? (
            <UserCheck size={18} strokeWidth={2.2} />
          ) : (
            <ClipboardList size={18} strokeWidth={2.2} />
          )}
        </div>

        <div className="text-sm leading-snug">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isDueReminder
                ? isOverdue
                  ? 'bg-amber-200/80 text-amber-900'
                  : 'bg-emerald-200/70 text-emerald-900'
                : isAssigned
                ? 'bg-emerald-200/70 text-emerald-900'
                : 'bg-sky-200/70 text-sky-900'
            }`}>
              {isDueReminder
                ? isOverdue
                  ? 'Task Overdue'
                  : 'Due Date Reminder'
                : isAssigned
                ? 'Assigned to You'
                : 'Unassigned Task'}
            </span>
            {notification.teamName && (
              <span className="text-xs text-slate-500 font-medium">
                in {notification.teamName}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-slate-800">
            {isDueReminder ? (
              <>
                <strong className="font-bold text-teal-950">&quot;{notification.taskName}&quot;</strong>
                {isOverdue ? ' was due ' : ' is due '}
                <span className={isOverdue ? 'font-bold text-amber-800' : 'font-semibold text-emerald-800'}>
                  {notification.dueDate ? formatDueDate(notification.dueDate) : 'today'}
                </span>
                {notification.room && (
                  <span className="text-xs text-slate-500 ml-1">({notification.room})</span>
                )}
              </>
            ) : (
              <>
                <strong className="font-bold text-teal-950">{notification.actorName || 'A teammate'}</strong>
                {isAssigned ? ' assigned you: ' : ' created unassigned task: '}
                <strong className="font-bold text-teal-950">&quot;{notification.taskName}&quot;</strong>
                {notification.room && (
                  <span className="text-xs text-slate-500 ml-1">({notification.room})</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {onNavigateToTask && (
          <button
            type="button"
            className={`inline-flex items-center gap-1 px-3.5 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer ${
              isDueReminder
                ? isOverdue
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
                : isAssigned
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-sky-600 hover:bg-sky-700'
            }`}
            onClick={() => onNavigateToTask(notification)}
          >
            <span>View Task</span>
            <ArrowRight size={13} />
          </button>
        )}
        <button
          type="button"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-all cursor-pointer"
          title="Dismiss notification"
          onClick={() => onDismiss(notification.id)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default NotificationBanner;
