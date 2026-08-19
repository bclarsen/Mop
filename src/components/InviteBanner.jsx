import { Mail } from 'lucide-react';

function InviteBanner({ invite, inviterName, onAccept, onDecline }) {
  return (
    <div className="mx-4 md:mx-8 mt-4 p-4 rounded-2xl bg-emerald-50/90 dark:bg-[#15221E] border border-emerald-200 dark:border-[#213630] text-teal-950 dark:text-[#F0FDF4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in relative z-20">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs shrink-0">
          <Mail size={18} strokeWidth={2} />
        </div>
        <div className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
          <span className="font-bold text-teal-950 dark:text-[#F0FDF4]">{inviterName}</span> invited you to join their household team:{' '}
          <span className="font-bold text-emerald-800 dark:text-emerald-300">{invite.teamName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <button
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
          onClick={onAccept}
        >
          Accept
        </button>
        <button
          className="px-3 py-1.5 bg-white dark:bg-[#1C2C27] hover:bg-slate-50 dark:hover:bg-[#233832] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-[#253D36] transition-all cursor-pointer"
          onClick={onDecline}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

export default InviteBanner;
