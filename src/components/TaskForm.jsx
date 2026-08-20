import { useState } from 'react';
import { Plus, X, Calendar, Clock, User, Layers, Flag, Pencil, Check, ListTodo, ChevronDown } from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyTaskCreation } from '../utils/notificationService';
import { useClickOutside } from '../hooks/useClickOutside';

import { CustomSelect } from './CustomSelect';

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
  activeTeam,
  rooms = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Other'],
  autoAssign = 'manual',
  tasks = [],
  routines = [],
  editingTask = null,
  onAddTask,
  onUpdateTask,
  onCancelEdit,
}) {
  const [expanded, setExpanded] = useState(Boolean(editingTask));
  const [name, setName] = useState(editingTask?.name || '');
  const [room, setRoom] = useState(editingTask?.room || rooms[0] || 'Kitchen');
  const [frequency, setFrequency] = useState(editingTask?.frequency || 'weekly');
  const [priority, setPriority] = useState(editingTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(
    editingTask?.dueDate ? editingTask.dueDate.split('T')[0] : '',
  );
  const [dueTime, setDueTime] = useState(
    editingTask?.dueDate && editingTask.dueDate.includes('T')
      ? editingTask.dueDate.split('T')[1]
      : '',
  );
  const [notes, setNotes] = useState(editingTask?.notes || '');
  const [assignedTo, setAssignedTo] = useState(
    editingTask?.assignedTo !== undefined
      ? editingTask.assignedTo
      : workspace === 'personal'
      ? user?.uid
      : '',
  );

  const [showRoutinesDropdown, setShowRoutinesDropdown] = useState(false);
  const routinesDropdownRef = useClickOutside(() => setShowRoutinesDropdown(false));

  const isRotating = workspace !== 'personal' && autoAssign === 'rotate';
  const rotatedAssignee = isRotating
    ? pickRotatedAssignee(allAssignees, tasks)
    : '';
  const rotatedName = allAssignees.find((a) => a.uid === rotatedAssignee)?.name;

  const handleAddFromRoutine = async (routine) => {
    setShowRoutinesDropdown(false);
    if (!routine || !routine.tasks || routine.tasks.length === 0) return;
    
    // Add each task in the routine
    for (const t of routine.tasks) {
      let resolvedAssignee = t.assignedTo || '';
      if (workspace === 'personal') {
        resolvedAssignee = user?.uid;
      } else if (isRotating && !t.assignedTo) {
        resolvedAssignee = rotatedAssignee;
      }

      const newTask = {
        name: t.name,
        room: t.room || rooms[0] || 'Kitchen',
        frequency: t.frequency || 'weekly',
        priority: t.priority || 'medium',
        dueDate: null, // routines don't save specific due dates
        notes: t.notes || '',
        assignedTo: resolvedAssignee,
        // eslint-disable-next-line react-hooks/purity
        createdAt: Date.now(),
        lastCompleted: null,
        completionHistory: [],
        workspace,
        ownerUid: user?.uid || 'guest-user',
      };

      try {
        if (!user?.isDemo) {
          const docRef = await addDoc(tasksRef, newTask);
          const taskWithId = { id: docRef.id, ...newTask };
          if (onAddTask) {
            onAddTask(taskWithId);
          }
        } else {
          // eslint-disable-next-line react-hooks/purity
          const demoTask = { id: `demo-task-${Date.now()}-${Math.random()}`, ...newTask };
          if (onAddTask) {
            onAddTask(demoTask);
          }
        }
      } catch (err) {
        console.warn('Error adding routine task to Firestore, adding locally:', err);
        // eslint-disable-next-line react-hooks/purity
        const fallbackTask = { id: `local-task-${Date.now()}-${Math.random()}`, ...newTask };
        if (onAddTask) {
          onAddTask(fallbackTask);
        }
      }
    }
  };

  const handleCancel = () => {
    setName('');
    setNotes('');
    setDueDate('');
    setDueTime('');
    setAssignedTo(workspace === 'personal' ? user?.uid : '');
    setExpanded(false);
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    let resolvedAssignee;
    if (workspace === 'personal') {
      resolvedAssignee = user?.uid;
    } else if (isRotating && !editingTask) {
      resolvedAssignee = assignedTo || rotatedAssignee;
    } else {
      resolvedAssignee = assignedTo;
    }

    if (editingTask) {
      const updatedFields = {
        name: name.trim(),
        room,
        frequency,
        priority,
        dueDate: dueDate ? (dueTime ? `${dueDate}T${dueTime}` : dueDate) : null,
        notes: notes.trim(),
        assignedTo: resolvedAssignee,
      };

      try {
        if (!user?.isDemo) {
          await updateDoc(doc(db, 'tasks', editingTask.id), updatedFields);
        }
        if (onUpdateTask) {
          onUpdateTask({ ...editingTask, ...updatedFields });
        }
      } catch (err) {
        console.warn('Error updating task in Firestore, updating locally:', err);
        if (onUpdateTask) {
          onUpdateTask({ ...editingTask, ...updatedFields });
        }
      }
      handleCancel();
      return;
    }

    const newTask = {
      name: name.trim(),
      room,
      frequency,
      priority,
      dueDate: dueDate ? (dueTime ? `${dueDate}T${dueTime}` : dueDate) : null,
      notes: notes.trim(),
      assignedTo: resolvedAssignee,
       
        createdAt: Date.now(),
      lastCompleted: null,
      completionHistory: [],
      workspace,
      ownerUid: user?.uid || 'guest-user',
    };

    try {
      if (!user?.isDemo) {
        const docRef = await addDoc(tasksRef, newTask);
        const taskWithId = { id: docRef.id, ...newTask };
        if (onAddTask) {
          onAddTask(taskWithId);
        }
        if (workspace !== 'personal' && activeTeam) {
          notifyTaskCreation({
            task: taskWithId,
            activeTeam: activeTeam,
            workspace: workspace,
            user: user,
            allAssignees: allAssignees,
          });
        }
      } else {
        const demoTask = { id: `demo-task-${Date.now()}`, ...newTask };
        if (onAddTask) {
          onAddTask(demoTask);
        }
      }
    } catch (err) {
      console.warn('Error adding task to Firestore, adding locally:', err);
      const fallbackTask = { id: `local-task-${Date.now()}`, ...newTask };
      if (onAddTask) {
        onAddTask(fallbackTask);
      }
    }

    handleCancel();
  };

  return (
    <div className="px-4 md:px-8 pt-5 pb-2">
      {!expanded ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="flex-1 py-3.5 px-5 bg-white dark:bg-[#15221E] hover:bg-emerald-50/70 dark:hover:bg-[#1C2C27] border border-dashed border-emerald-300 dark:border-[#253D36] text-emerald-800 dark:text-emerald-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add New Task</span>
          </button>
          
          <div className="relative flex-1 sm:max-w-[240px]" ref={routinesDropdownRef}>
            <button
              type="button"
              className="w-full h-full py-3.5 px-5 bg-white dark:bg-[#15221E] hover:bg-emerald-50/70 dark:hover:bg-[#1C2C27] border border-dashed border-emerald-300 dark:border-[#253D36] text-emerald-800 dark:text-emerald-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              onClick={() => setShowRoutinesDropdown(!showRoutinesDropdown)}
            >
              <ListTodo size={18} strokeWidth={2.5} />
              <span>Add from Routine</span>
              <ChevronDown size={14} className={`ml-1 transition-transform ${showRoutinesDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showRoutinesDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#15221E] border border-emerald-100 dark:border-[#213630] rounded-xl shadow-lg z-50 overflow-hidden py-1 max-h-64 overflow-y-auto">
                {routines.length > 0 ? (
                  routines.map(routine => (
                    <button
                      key={routine.id}
                      onClick={() => handleAddFromRoutine(routine)}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-teal-950 dark:text-[#F0FDF4] hover:bg-emerald-50 dark:hover:bg-[#1C2C27] transition-colors flex flex-col cursor-pointer"
                    >
                      <span>{routine.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {routine.tasks?.length || 0} tasks
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center">
                    No routines created yet. Create one in the Routines tab.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#15221E] border border-emerald-200/90 dark:border-[#213630] rounded-3xl p-5 md:p-6 shadow-md shadow-emerald-950/5 animate-fade-in flex flex-col gap-5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                editingTask
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                {editingTask ? <Pencil size={18} strokeWidth={2.2} /> : <Plus size={18} strokeWidth={2.5} />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight">
                  {editingTask ? 'Edit Chore or Task' : 'Create Chore or Task'}
                </h3>
                {editingTask && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-xs sm:max-w-md">
                    Modifying: <span className="font-bold text-slate-700 dark:text-slate-200">{editingTask.name}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1C2C27] transition-colors cursor-pointer"
              onClick={handleCancel}
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1C2C27] border border-slate-200 dark:border-[#253D36] rounded-xl text-sm font-medium text-slate-900 dark:text-[#F0FDF4] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#111B18] transition-all"
              placeholder="What needs to get done? (e.g. Clean kitchen counters)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Room / Area</span>
              </label>
              <CustomSelect
                value={room}
                onChange={setRoom}
                options={rooms.map((r) => ({ value: r, label: r }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Frequency</span>
              </label>
              <CustomSelect
                value={frequency}
                onChange={setFrequency}
                options={FREQUENCIES}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
                <Flag size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Priority</span>
              </label>
              <CustomSelect
                value={priority}
                onChange={setPriority}
                options={PRIORITIES}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!e.target.value) setDueTime('');
                }}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#1C2C27] border border-slate-200 dark:border-[#253D36] rounded-xl text-sm text-slate-800 dark:text-[#F0FDF4] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#111B18]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Due Time (Optional)</span>
              </label>
              <input
                type="time"
                step={60}
                value={dueTime}
                disabled={!dueDate}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#1C2C27] border border-slate-200 dark:border-[#253D36] rounded-xl text-sm text-slate-800 dark:text-[#F0FDF4] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#111B18] disabled:opacity-40"
              />
            </div>

            {workspace !== 'personal' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Assign To</span>
                </label>
                <CustomSelect
                  value={assignedTo}
                  onChange={setAssignedTo}
                  options={[
                    {
                      value: '',
                      label: isRotating && rotatedName
                        ? `Auto: next is ${rotatedName}`
                        : 'Unassigned',
                    },
                    ...allAssignees.map((a) => ({ value: a.uid, label: a.name })),
                  ]}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider">Notes & Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Use disinfectant spray under the sink"
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#1C2C27] border border-slate-200 dark:border-[#253D36] rounded-xl text-sm text-slate-800 dark:text-[#F0FDF4] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-[#111B18] transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-[#213630]">
            <button
              type="button"
              className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              {editingTask ? (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>Save Changes</span>
                </>
              ) : (
                <span>Create Task</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default TaskForm;
