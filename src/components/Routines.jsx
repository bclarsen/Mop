import { useState } from 'react';
import { Plus, X, Pencil, Trash2, ListTodo, Layers, User } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomSelect } from './CustomSelect';

const routinesRef = collection(db, 'routines');

const PRIORITIES = [
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' },
];

const FREQUENCIES = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function Routines({ user, workspace, rooms, allAssignees, routines }) {
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  
  // For adding/editing tasks inside a routine
  const [taskFormRoutineId, setTaskFormRoutineId] = useState(null);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null); // Inside a routine's tasks array
  
  // Task form state
  const [taskName, setTaskName] = useState('');
  const [taskRoom, setTaskRoom] = useState(rooms[0] || 'Kitchen');
  const [taskFrequency, setTaskFrequency] = useState('weekly');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskAssignee, setTaskAssignee] = useState(workspace === 'personal' ? user?.uid : '');

  const resetTaskForm = () => {
    setTaskName('');
    setTaskRoom(rooms[0] || 'Kitchen');
    setTaskFrequency('weekly');
    setTaskPriority('medium');
    setTaskNotes('');
    setTaskAssignee(workspace === 'personal' ? user?.uid : '');
    setEditingTaskIndex(null);
    setTaskFormRoutineId(null);
  };

  const handleCreateRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;
    
    const newRoutine = {
      name: newRoutineName.trim(),
      workspace,
      ownerUid: user?.uid || 'guest-user',
      createdAt: Date.now(),
      tasks: [],
    };
    
    if (!user?.isDemo) {
      await addDoc(routinesRef, newRoutine);
    }
    setNewRoutineName('');
    setIsCreatingRoutine(false);
  };
  
  const handleDeleteRoutine = async (routineId) => {
    if (window.confirm('Are you sure you want to delete this routine?')) {
      if (!user?.isDemo) {
        await deleteDoc(doc(db, 'routines', routineId));
      }
    }
  };

  const handleSaveTask = async (routine) => {
    if (!taskName.trim()) return;
    
    const updatedTasks = [...(routine.tasks || [])];
    const newTask = {
      id: Date.now().toString(),
      name: taskName.trim(),
      room: taskRoom,
      priority: taskPriority,
      frequency: taskFrequency,
      notes: taskNotes.trim(),
      assignedTo: taskAssignee,
    };
    
    if (editingTaskIndex !== null) {
      // Retain the old id if editing
      newTask.id = updatedTasks[editingTaskIndex].id;
      updatedTasks[editingTaskIndex] = newTask;
    } else {
      updatedTasks.push(newTask);
    }
    
    if (!user?.isDemo) {
      await updateDoc(doc(db, 'routines', routine.id), { tasks: updatedTasks });
    }
    resetTaskForm();
  };

  const handleDeleteTask = async (routine, taskIndex) => {
    const updatedTasks = [...(routine.tasks || [])];
    updatedTasks.splice(taskIndex, 1);
    if (!user?.isDemo) {
      await updateDoc(doc(db, 'routines', routine.id), { tasks: updatedTasks });
    }
  };

  const openTaskForm = (routine, taskIndex = null) => {
    setTaskFormRoutineId(routine.id);
    if (taskIndex !== null) {
      const task = routine.tasks[taskIndex];
      setTaskName(task.name || '');
      setTaskRoom(task.room || rooms[0] || 'Kitchen');
      setTaskFrequency(task.frequency || 'weekly');
      setTaskPriority(task.priority || 'medium');
      setTaskNotes(task.notes || '');
      setTaskAssignee(task.assignedTo || '');
      setEditingTaskIndex(taskIndex);
    } else {
      resetTaskForm();
      setTaskFormRoutineId(routine.id);
    }
  };

  return (
    <div className="px-4 md:px-8 py-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight flex items-center gap-2">
            <ListTodo className="text-emerald-600 dark:text-emerald-400" size={24} />
            Task Routines
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create groups of tasks that you can quickly add to your active list later.
          </p>
        </div>
        {!isCreatingRoutine && (
          <button
            onClick={() => setIsCreatingRoutine(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Routine
          </button>
        )}
      </div>

      {isCreatingRoutine && (
        <form onSubmit={handleCreateRoutine} className="bg-white dark:bg-[#15221E] border border-emerald-200/90 dark:border-[#213630] rounded-3xl p-5 mb-6 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-teal-950 dark:text-[#F0FDF4]">Create New Routine</h3>
            <button
              type="button"
              onClick={() => setIsCreatingRoutine(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              placeholder="e.g. Weekend Deep Clean"
              className="flex-1 px-4 py-2 bg-slate-50 dark:bg-[#1C2C27] border border-slate-200 dark:border-[#253D36] rounded-xl text-sm font-medium text-slate-900 dark:text-[#F0FDF4] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newRoutineName.trim()}
              className="px-5 py-2 bg-teal-950 dark:bg-emerald-500 hover:bg-teal-900 dark:hover:bg-emerald-400 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {routines.length === 0 && !isCreatingRoutine ? (
        <div className="bg-slate-50 dark:bg-[#15221E] border border-dashed border-slate-200 dark:border-[#253D36] rounded-3xl p-8 flex flex-col items-center justify-center text-center">
          <ListTodo className="text-slate-300 dark:text-[#253D36] mb-3" size={40} />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No routines yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-sm">
            Create a routine to bundle related chores together (like "Monthly Cleaning" or "Party Prep").
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {routines.map((routine) => (
            <div key={routine.id} className="bg-white dark:bg-[#15221E] border border-slate-200 dark:border-[#213630] rounded-3xl shadow-xs overflow-hidden">
              <div className="bg-slate-50/50 dark:bg-[#1C2C27]/30 px-5 py-4 border-b border-slate-100 dark:border-[#213630] flex items-center justify-between">
                <h3 className="font-extrabold text-teal-950 dark:text-[#F0FDF4] text-base">{routine.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#111B18] px-2 py-0.5 rounded-full border border-slate-200 dark:border-[#253D36]">
                    {routine.tasks?.length || 0} {(routine.tasks?.length === 1) ? 'task' : 'tasks'}
                  </span>
                  <button
                    onClick={() => handleDeleteRoutine(routine.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-1 cursor-pointer"
                    title="Delete Routine"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {routine.tasks?.length > 0 ? (
                  <div className="flex flex-col gap-2.5 mb-4">
                    {routine.tasks.map((task, index) => (
                      <div key={task.id || index} className="group flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1C2C27] rounded-xl border border-slate-100 dark:border-[#253D36]">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{task.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Layers size={10} />
                                {task.room}
                              </span>
                              {task.assignedTo && (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <User size={10} />
                                  {allAssignees.find((a) => a.uid === task.assignedTo)?.name || 'Someone'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openTaskForm(routine, index)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(routine, index)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-4 px-2">No tasks in this routine yet.</p>
                )}

                {taskFormRoutineId === routine.id ? (
                  <div className="bg-slate-50 dark:bg-[#1C2C27]/50 border border-emerald-200/60 dark:border-[#253D36] rounded-2xl p-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider">
                        {editingTaskIndex !== null ? 'Edit Routine Task' : 'Add Routine Task'}
                      </h4>
                      <button onClick={resetTaskForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        placeholder="Task name"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] rounded-lg text-sm font-medium text-slate-900 dark:text-[#F0FDF4] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Room</label>
                          <CustomSelect
                            value={taskRoom}
                            onChange={setTaskRoom}
                            options={rooms.map((r) => ({ value: r, label: r }))}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                          <CustomSelect
                            value={taskPriority}
                            onChange={setTaskPriority}
                            options={PRIORITIES}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Frequency</label>
                          <CustomSelect
                            value={taskFrequency}
                            onChange={setTaskFrequency}
                            options={FREQUENCIES}
                          />
                        </div>
                        {workspace !== 'personal' && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Default Assignee</label>
                            <CustomSelect
                              value={taskAssignee}
                              onChange={setTaskAssignee}
                              options={[
                                { value: '', label: 'Auto / Unassigned' },
                                ...allAssignees.map(a => ({ value: a.uid, label: a.name }))
                              ]}
                            />
                          </div>
                        )}
                      </div>
                      
                      <textarea
                        value={taskNotes}
                        onChange={(e) => setTaskNotes(e.target.value)}
                        placeholder="Additional notes (optional)"
                        className="w-full px-3 py-2 bg-white dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px]"
                      />
                      
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => handleSaveTask(routine)}
                          disabled={!taskName.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          {editingTaskIndex !== null ? 'Save Changes' : 'Add to Routine'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openTaskForm(routine)}
                    className="w-full py-2.5 border border-dashed border-emerald-300 dark:border-[#253D36] text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-50/50 dark:hover:bg-[#1C2C27] transition-colors cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    Add Task Template
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
