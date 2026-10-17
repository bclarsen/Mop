import { Sparkles, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * Computes health status info for a room or entire workspace:
 * - 100%: Sparkling (Emerald green gradient with sparkles)
 * - 70-99%: Fresh (Teal-emerald gradient)
 * - 40-69%: Needs Attention (Amber gradient)
 * - 0-39%: Action Required / Overdue (Rose/Red gradient)
 * - No tasks: Spotless / Calm (Subtle emerald/slate)
 */
export function getHealthStatus(totalTasks, completedTasks, overdueTasks = 0) {
  if (totalTasks === 0) {
    return {
      percentage: 100,
      label: 'Spotless',
      sublabel: 'No tasks scheduled',
      tone: 'sparkling',
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
      gradientId: 'grad-sparkling',
      strokeColor: '#10B981',
      strokeGradient: ['#34D399', '#059669'],
      Icon: Sparkles,
    };
  }

  const basePercentage = Math.round((completedTasks / totalTasks) * 100);
  const percentage = Math.max(0, Math.min(100, basePercentage));

  if (percentage === 100 && overdueTasks === 0) {
    return {
      percentage: 100,
      label: 'Sparkling',
      sublabel: 'All chores up to date',
      tone: 'sparkling',
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
      gradientId: 'grad-sparkling',
      strokeColor: '#10B981',
      strokeGradient: ['#34D399', '#059669'],
      Icon: Sparkles,
    };
  }

  if (percentage >= 70 && overdueTasks === 0) {
    return {
      percentage,
      label: 'Fresh',
      sublabel: `${totalTasks - completedTasks} chore${totalTasks - completedTasks === 1 ? '' : 's'} remaining`,
      tone: 'fresh',
      colorClass: 'text-teal-600 dark:text-teal-400',
      bgClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800/40',
      gradientId: 'grad-fresh',
      strokeColor: '#0D9488',
      strokeGradient: ['#2DD4BF', '#0F766E'],
      Icon: ShieldCheck,
    };
  }

  if (percentage >= 40 || (overdueTasks === 0 && percentage > 0)) {
    return {
      percentage,
      label: 'Needs Attention',
      sublabel: overdueTasks > 0 ? `${overdueTasks} overdue chore${overdueTasks === 1 ? '' : 's'}` : `${totalTasks - completedTasks} chores pending`,
      tone: 'attention',
      colorClass: 'text-amber-500 dark:text-amber-400',
      bgClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
      gradientId: 'grad-attention',
      strokeColor: '#F59E0B',
      strokeGradient: ['#FBBF24', '#D97706'],
      Icon: AlertTriangle,
    };
  }

  return {
    percentage,
    label: 'Action Required',
    sublabel: overdueTasks > 0 ? `${overdueTasks} overdue chore${overdueTasks === 1 ? '' : 's'}` : 'Chores neglected',
    tone: 'urgent',
    colorClass: 'text-rose-500 dark:text-rose-400',
    bgClass: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
    gradientId: 'grad-urgent',
    strokeColor: '#F43F5E',
    strokeGradient: ['#FB7185', '#E11D48'],
    Icon: AlertCircle,
  };
}
