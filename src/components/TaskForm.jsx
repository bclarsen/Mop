import { useState } from 'react';
import { Plus, X, Calendar, Clock, User, Layers, Flag } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const tasksRef = collection(db, 'tasks');

const FREQUENCIES = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const PRIORITIES = [
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' },
];

function pickRotatedAssignee(allAssignees, tasks) {
  const eligible = allAssignees.filter((a) => !a.isPending);
  if (eligible.length === 0) return '';
  const counts = eligible.map(
    (a) => tasks.filter((t) => t.assignedTo === a.uid).length,
  );
  const fewest = Math.min(...counts);
  return eligible[counts.indexOf(fewest)].uid;
}

function TaskForm({
  user,
  allAssignees = [],
  workspace,
  rooms = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Other'],
  autoAssign = 'manual',
  tasks = [],
  onAddTask,
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('Kitchen');
  const [frequency, setFrequency] = useState('weekly');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState(workspace === 'personal' ? user?.uid : '');

  const isRotating = workspace !== 'personal' && autoAssign === 'rotate';
  const rotatedAssignee = isRotating
    ? pickRotatedAssignee(allAssignees, tasks)
    : '';
  const rotatedName = allAssignees.find((a) => a.uid === rotatedAssignee)?.name;

  const addTask = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    let resolvedAssignee;
    if (workspace === 'personal') {
      resolvedAssignee = user?.uid;
    } else if (isRotating) {
      resolvedAssignee = assignedTo || rotatedAssignee;
    } else {
      resolvedAssignee = assignedTo;
    }

    const newTaskData = {
      name: name.trim(),
      room,
      frequency,
      priority,
      dueDate: dueDate ? (dueTime ? `${dueDate}T${dueTime}` : dueDate) : null,
      assignedTo: resolvedAssignee,
      notes: notes.trim(),
      lastCompleted: null,
      completionHistory: [],
      workspace: workspace,
      ownerUid: workspace === 'personal' ? user?.uid : null,
    };

    try {
      if (!user?.isDemo) {
        const docRef = await addDoc(tasksRef, newTaskData);
        if (onAddTask) {
          onAddTask({ id: docRef.id, ...newTaskData });
        }
      } else if (onAddTask) {
        onAddTask({ id: `demo-task-${Date.now()}`, ...newTaskData });
      }
    } catch (err) {
      console.warn('Error adding task to Firestore, adding to local state:', err);
      if (onAddTask) {
        onAddTask({ id: `demo-task-${Date.now()}`, ...newTaskData });
      }
    }

    setName('');
    setNotes('');
    setDueDate('');
    setDueTime('');
    setAssignedTo(workspace === 'personal' ? user?.uid : '');
    setExpanded(false);
  };

  return (
    <div className="px-4 md:px-8 pt-6 pb-2">
      {!expanded ? (
        <button
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add New Task</span>
        </button>
      ) : (
        <form onSubmit={addTask} className="bg-white border border-emerald-200/90 rounded-3xl p-5 md:p-6 shadow-md shadow-emerald-950/5 animate-fade-in flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-teal-950 tracking-tight">Create Chore or Task</h3>
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              onClick={() => setExpanded(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              placeholder="What needs to get done? (e.g. Clean kitchen counters)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-emerald-600" />
                <span>Room / Area</span>
              </label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {rooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-600" />
                <span>Frequency</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                <Flag size={13} className="text-emerald-600" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-600" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!e.target.value) setDueTime('');
                }}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-600" />
                <span>Due Time (Optional)</span>
              </label>
              <input
                type="time"
                step={60}
                value={dueTime}
                disabled={!dueDate}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-40"
              />
            </div>

            {workspace !== 'personal' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-emerald-600" />
                  <span>Assign To</span>
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value="">
                    {isRotating && rotatedName
                      ? `Auto: next is ${rotatedName}`
                      : 'Unassigned'}
                  </option>
                  {allAssignees.map((a) => (
                    <option key={a.uid} value={a.uid}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Notes & Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Use disinfectant spray under the sink"
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              Create Task
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default TaskForm;
