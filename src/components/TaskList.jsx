import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, ListTodo, Archive, ArrowRight } from 'lucide-react';
import TaskItem from './TaskItem';
import {
  DEFAULT_COMPLETED_WINDOW_MS,
  formatDuration,
  isOverdue,
  isRecentlyCompleted,
  isTaskDone,
} from '../utils/dateHelpers';

const PRIORITY_POINTS = {
  high: 3,
  medium: 2,
  low: 1,
};

function getTaskPoints(task) {
  return PRIORITY_POINTS[task.priority] ?? 2;
}

function groupAndSort(taskArr) {
  const grouped = taskArr.reduce((acc, task) => {
    const room = task.room || 'Other';
    if (!acc[room]) acc[room] = [];
    acc[room].push(task);
    return acc;
  }, {});

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  Object.keys(grouped).forEach((room) => {
    grouped[room].sort((a, b) => {
      const aOverdue = isOverdue(a) ? 0 : 1;
      const bOverdue = isOverdue(b) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return (
        (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
      );
    });
  });

  // Calculate total and average priority points for each living space
  const roomScores = {};
  Object.keys(grouped).forEach((room) => {
    const roomTasks = grouped[room];
    const totalPoints = roomTasks.reduce((sum, task) => sum + getTaskPoints(task), 0);
    const avgPoints = roomTasks.length > 0 ? totalPoints / roomTasks.length : 0;
    roomScores[room] = { totalPoints, avgPoints };
  });

  // Sort living spaces by highest average points first; break ties by greatest total points
  const sortedRooms = Object.keys(grouped).sort((roomA, roomB) => {
    const scoreA = roomScores[roomA];
    const scoreB = roomScores[roomB];

    if (scoreB.avgPoints !== scoreA.avgPoints) {
      return scoreB.avgPoints - scoreA.avgPoints;
    }
    if (scoreB.totalPoints !== scoreA.totalPoints) {
      return scoreB.totalPoints - scoreA.totalPoints;
    }
    return roomA.localeCompare(roomB);
  });

  const sortedGrouped = {};
  sortedRooms.forEach((room) => {
    sortedGrouped[room] = grouped[room];
  });

  return sortedGrouped;
}

function TaskList({
  tasks,
  currentUser,
  allAssignees,
  completedWindowMs = DEFAULT_COMPLETED_WINDOW_MS,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onNavigateTab,
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    // Tick every 1 second so completion windows (including custom seconds) refresh dynamically
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="px-4 md:px-8 py-12">
        <div className="text-center py-16 px-4 border border-dashed border-emerald-200 bg-white/70 rounded-3xl">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl inline-flex mb-3">
            <Sparkles size={28} strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-bold text-teal-950 mb-1">No chores or tasks found</h3>
          <p className="text-xs text-slate-500">Add a task above or adjust your filter selection.</p>
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => !isTaskDone(t));
  const completedTasks = tasks.filter(
    (t) => isTaskDone(t) && isRecentlyCompleted(t, completedWindowMs),
  );
  const archivedTasks = tasks.filter(
    (t) => isTaskDone(t) && !isRecentlyCompleted(t, completedWindowMs),
  );

  // If no active tasks and no recently completed tasks, but some archived tasks exist
  if (activeTasks.length === 0 && completedTasks.length === 0 && archivedTasks.length > 0) {
    return (
      <div className="px-4 md:px-8 pb-16 flex flex-col gap-6">
        <div className="text-center py-16 px-4 border border-dashed border-emerald-200 bg-white/70 rounded-3xl">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl inline-flex mb-3">
            <CheckCircle2 size={28} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold text-teal-950 mb-1">All chores completed!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            All chores in this workspace are done. Completed tasks past your {formatDuration(completedWindowMs)} visibility window are archived in History.
          </p>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('history')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>View History Log ({archivedTasks.length})</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 pb-16 flex flex-col gap-8">
      {/* Active Tasks Section */}
      {activeTasks.length > 0 && (
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-1 border-b border-emerald-100/80">
            <ListTodo size={18} className="text-emerald-600" />
            <h2 className="text-sm font-extrabold text-teal-950 uppercase tracking-wider">
              Active Tasks ({activeTasks.length})
            </h2>
          </div>

          {Object.entries(groupAndSort(activeTasks)).map(([room, roomTasks]) => (
            <div key={room} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <span>{room}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 font-extrabold">
                    {roomTasks.length}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {roomTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    allAssignees={allAssignees}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onEditTask={onEditTask}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Recently Completed Tasks Section (Faded) */}
      {completedTasks.length > 0 && (
        <section className="flex flex-col gap-5 pt-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">
              Completed Tasks ({completedTasks.length})
            </h2>
          </div>

          {Object.entries(groupAndSort(completedTasks)).map(([room, roomTasks]) => (
            <div key={room} className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-400">
                {room} ({roomTasks.length})
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {roomTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    allAssignees={allAssignees}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onEditTask={onEditTask}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Archived Notice when older completed tasks are hidden by preference */}
      {archivedTasks.length > 0 && (
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Archive size={15} className="text-slate-400 shrink-0" />
            <span>
              <strong className="text-slate-700 font-semibold">{archivedTasks.length}</strong> completed {archivedTasks.length === 1 ? 'task is' : 'tasks are'} archived beyond your visibility setting ({formatDuration(completedWindowMs)}).
            </span>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('history')}
              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <span>View History Log</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskList;

