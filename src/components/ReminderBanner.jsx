import { Bell } from 'lucide-react';

function ReminderBanner({ task, onDismiss }) {
  if (!task) return null;

  return (
    <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
          <Bell size={18} strokeWidth={2.2} />
        </div>

        <div className="text-sm text-amber-900 leading-snug">
          Task reminder: <strong className="font-bold text-amber-950">{task.name}</strong> is due soon!
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95"
          onClick={() => onDismiss(task.id)}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default ReminderBanner;
