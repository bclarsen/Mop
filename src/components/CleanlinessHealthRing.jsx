import { getHealthStatus } from '../utils/healthHelpers';

function CleanlinessHealthRing({
  totalTasks = 0,
  completedTasks = 0,
  overdueTasks = 0,
  size = 72,
  strokeWidth = 6,
  showLabel = false,
  showPercentage = true,
  className = '',
  uniqueId = 'health-ring',
}) {
  const status = getHealthStatus(totalTasks, completedTasks, overdueTasks);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (status.percentage / 100) * circumference;

  const gradientUniqueId = `${uniqueId}-${status.tone}`;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 origin-center overflow-visible"
        >
          <defs>
            <linearGradient id={gradientUniqueId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={status.strokeGradient[0]} />
              <stop offset="100%" stopColor={status.strokeGradient[1]} />
            </linearGradient>
            <filter id={`glow-${gradientUniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={status.strokeGradient[0]} floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-100 dark:text-[#1C2C27] transition-colors"
          />

          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientUniqueId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            filter={`url(#glow-${gradientUniqueId})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
          {showPercentage ? (
            <div className="flex items-baseline">
              <span className={`font-extrabold tracking-tight tabular-nums leading-none ${size >= 80 ? 'text-lg' : size >= 60 ? 'text-sm' : 'text-xs'} ${status.colorClass}`}>
                {status.percentage}
              </span>
              <span className={`text-[10px] font-bold ${status.colorClass} opacity-80 leading-none`}>%</span>
            </div>
          ) : (
            <status.Icon size={size >= 60 ? 18 : 14} className={status.colorClass} />
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-1.5 text-center">
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${status.bgClass}`}>
            <status.Icon size={11} strokeWidth={2.5} />
            <span>{status.label}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default CleanlinessHealthRing;
