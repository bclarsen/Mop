import { useState, useEffect, useRef } from 'react';
import { Home, Users, Filter, X, ChevronDown } from 'lucide-react';
import { isOverdue, parseDueDate, resolveCompletedWindowMs, DEFAULT_COMPLETED_WINDOW_MS, isDueWithinWindow } from './utils/dateHelpers';
import { getWorkspaceDocId } from "./utils/workspaceHelpers.js";
import { useClickOutside } from './hooks/useClickOutside';
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import Inventory from './components/Inventory';
import Login from './components/Login';
import Header from './components/Header';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import StatsPanel from './components/StatsPanel';
import LivingSpace from './components/LivingSpace';
import ProfileSetup from './components/ProfileSetup';
import Sidebar from './components/Sidebar';
import UserProfile from './components/UserProfile';
import Preferences from './components/Preferences';
import History from './components/History';
import InviteBanner from './components/InviteBanner';
import ReminderBanner from './components/ReminderBanner';
import { SETTINGS_TAB_IDS } from './constants/settings';

const tasksRef = collection(db, 'tasks');
const invitesRef = collection(db, 'teamInvites');
const teamsRef = collection(db, 'teams');

const DEFAULT_ROOMS = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Other'];
const FILTER_PRIORITIES = [
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' },
];
const FILTER_DATE_OPTIONS = [
  { value: 'overdue', label: 'Overdue Only' },
  { value: 'today', label: 'Due Today' },
  { value: 'week', label: 'Due This Week' },
  { value: 'none', label: 'No Due Date' },
];

const SAMPLE_DEMO_TASKS = [
  {
    id: 'demo-task-1',
    name: 'Wipe kitchen counters & stovetop',
    room: 'Kitchen',
    frequency: 'daily',
    priority: 'high',
    dueDate: new Date().toISOString().split('T')[0],
    assignedTo: 'demo-guest-cleaner',
    notes: 'Use multi-surface disinfectant spray',
    lastCompleted: null,
    completionHistory: [],
    workspace: 'personal',
    ownerUid: 'demo-guest-cleaner',
  },
  {
    id: 'demo-task-2',
    name: 'Deep clean bathroom sink & mirror',
    room: 'Bathroom',
    frequency: 'weekly',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    assignedTo: 'demo-guest-cleaner',
    notes: 'Glass cleaner is under the sink',
    lastCompleted: null,
    completionHistory: [],
    workspace: 'personal',
    ownerUid: 'demo-guest-cleaner',
  },
  {
    id: 'demo-task-personal-low',
    name: 'Organize pantry shelves & spice rack',
    room: 'Kitchen',
    frequency: 'monthly',
    priority: 'low',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    assignedTo: 'demo-guest-cleaner',
    notes: 'Check expiry dates on canned goods',
    lastCompleted: null,
    completionHistory: [],
    workspace: 'personal',
    ownerUid: 'demo-guest-cleaner',
  },
  {
    id: 'demo-task-3',
    name: 'Vacuum living room rug',
    room: 'Living Room',
    frequency: 'weekly',
    priority: 'low',
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    assignedTo: 'demo-roommate-1',
    notes: 'Empty canister when finished',
    lastCompleted: null,
    completionHistory: [],
    workspace: 'apartment-team',
    ownerUid: 'demo-guest-cleaner',
  },
  {
    id: 'demo-task-4',
    name: 'Take out recycling & trash bins',
    room: 'Other',
    frequency: 'weekly',
    priority: 'high',
    dueDate: new Date().toISOString().split('T')[0],
    assignedTo: 'demo-guest-cleaner',
    notes: 'Bin pickup on Tuesday morning',
    lastCompleted: null,
    completionHistory: [],
    workspace: 'apartment-team',
    ownerUid: 'demo-guest-cleaner',
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [workspaceInvites, setWorkspaceInvites] = useState([]);
  const [filterRoom, setFilterRoom] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterDate, setFilterDate] = useState('All');
  const [activeTab, setActiveTab] = useState('tasks');
  const [usersMap, setUsersMap] = useState({});
  const [dismissedReminders, setDismissedReminders] = useState({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const [workspace, setWorkspace] = useState('personal');
  const [teams, setTeams] = useState([{ id: 'personal', name: 'Personal' }]);
  const [myInvites, setMyInvites] = useState([]);
  const appliedDefaultWorkspace = useRef(false);
  const defaultWorkspaceRef = useRef(null);

  // Filter menu UI state
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [expandedFilterType, setExpandedFilterType] = useState(null);
  const filterMenuRef = useClickOutside(() => setShowFilterMenu(false));

  const handleGuestLogin = () => {
    const demoUser = {
      uid: 'demo-guest-cleaner',
      email: 'guest@cleanist.app',
      displayName: 'Guest Cleaner',
      photoURL: '',
      isDemo: true,
    };
    setUser(demoUser);
    setNeedsProfileSetup(false);
    setAuthLoading(false);
    setUsersMap({
      'demo-guest-cleaner': {
        uid: 'demo-guest-cleaner',
        displayName: 'Guest Cleaner',
        email: 'guest@cleanist.app',
      },
      'demo-roommate-1': {
        uid: 'demo-roommate-1',
        displayName: 'Alex (Roommate)',
        email: 'alex@cleanist.app',
      },
    });
    setTeams([
      { id: 'personal', name: 'Personal' },
      {
        id: 'apartment-team',
        name: 'Apartment 4B',
        members: ['demo-guest-cleaner', 'demo-roommate-1'],
        createdBy: 'demo-guest-cleaner',
      },
    ]);
    setTasks(SAMPLE_DEMO_TASKS);
  };

  const handleAddTask = (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleTask = (taskId, completion) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          lastCompleted: completion.completedAt,
          lastCompletedBy: completion.completedBy,
          lastCompletedByName: completion.completedByName,
          completionHistory: [...(t.completionHistory || []), completion],
        };
      }),
    );
  };

  const handleDeleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const [storedRooms, setStoredRooms] = useState(null);
  const workspaceDocId = user && !user.isDemo ? getWorkspaceDocId(workspace, user.uid) : null;

  useEffect(() => {
    if (!workspaceDocId || user?.isDemo) return;
    const unsub = onSnapshot(
      doc(db, 'workspaces', workspaceDocId),
      (snap) => setStoredRooms({ id: workspaceDocId, rooms: snap.data()?.rooms }),
      (err) => console.warn('Note: rooms snapshot fallback:', err?.code || err),
    );
    return unsub;
  }, [workspaceDocId, user?.isDemo]);

  const rooms = storedRooms?.id === workspaceDocId && storedRooms.rooms?.length
    ? storedRooms.rooms
    : DEFAULT_ROOMS;

  useEffect(() => {
    if (!user || user.isDemo || !workspace) return;
    const q = workspace === 'personal'
      ? query(tasksRef, where('workspace', '==', 'personal'), where('ownerUid', '==', user.uid))
      : query(tasksRef, where('workspace', '==', workspace));

    const unsub = onSnapshot(
      q,
      (snapshot) => setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('Note: tasks snapshot fallback:', err?.code || err),
    );
    return unsub;
  }, [user, workspace]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
          const profileComplete = userDocSnap.exists() && userDocSnap.data().profileComplete;
          defaultWorkspaceRef.current =
            userDocSnap.data()?.preferences?.defaultWorkspace ?? null;

          if (!profileComplete) {
            setUser(currentUser);
            setNeedsProfileSetup(true);
            setAuthLoading(false);
            return;
          }

          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
            },
            { merge: true },
          );
        } catch (err) {
          console.warn('Error syncing user profile with Firestore:', err);
        }
      }
      setUser(currentUser);
      setNeedsProfileSetup(false);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || user.isDemo) return;
    const q = query(teamsRef, where('members', 'array-contains', user.uid));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTeams = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTeams([{ id: 'personal', name: 'Personal' }, ...fetchedTeams]);

        if (!appliedDefaultWorkspace.current) {
          appliedDefaultWorkspace.current = true;
          const preferred = defaultWorkspaceRef.current;
          if (
            preferred &&
            preferred !== 'personal' &&
            fetchedTeams.some((t) => t.id === preferred)
          ) {
            setWorkspace(preferred);
          }
        }
      },
      (err) => console.warn('Note: teams snapshot fallback:', err?.code || err),
    );
    return () => {
      unsub();
      appliedDefaultWorkspace.current = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.isDemo || !workspace || workspace === 'personal') {
      return;
    }
    const q = query(invitesRef, where('teamId', '==', workspace));
    const unsub = onSnapshot(
      q,
      (snapshot) => setWorkspaceInvites(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('Note: invites snapshot fallback:', err?.code || err),
    );
    return () => {
      unsub();
      setWorkspaceInvites([]);
    };
  }, [user, workspace]);

  useEffect(() => {
    if (!user?.email || user?.isDemo) return;
    const q = query(
      invitesRef,
      where('inviteeEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => setMyInvites(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn('Note: my invites snapshot fallback:', err?.code || err),
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || user.isDemo) return;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const map = {};
        snapshot.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setUsersMap(map);
      },
      (err) => console.warn('Note: users snapshot fallback:', err?.code || err),
    );
    return () => {
      unsub();
      setUsersMap({});
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F9F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-teal-950">Starting Mop...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Login onGuestLogin={handleGuestLogin} />;
  if (needsProfileSetup) {
    return (
      <ProfileSetup
        user={user}
        onComplete={(displayName) => {
          setUser((prev) => ({ ...prev, displayName }));
          setNeedsProfileSetup(false);
        }}
      />
    );
  }

  const activeTeam = teams.find((t) => t.id === workspace);

  const completedWindowMs =
    workspace === 'personal'
      ? (usersMap[user.uid]?.preferences?.completedWindowMs ?? DEFAULT_COMPLETED_WINDOW_MS)
      : resolveCompletedWindowMs(
          usersMap[user.uid]?.preferences?.completedWindowMs,
          activeTeam?.preferences?.completedWindowMs,
        );

  const myPendingInvites = myInvites;

  const allAssignees = [];
  if (workspace === 'personal') {
    allAssignees.push({
      uid: user.uid,
      name: user.displayName || 'You',
      photoURL: user.photoURL,
      email: user.email,
    });
  } else if (activeTeam) {
    (activeTeam.members || []).forEach((uid) => {
      const u = usersMap[uid];
      allAssignees.push({
        uid: uid,
        name: u?.displayName || (uid === user.uid ? (user.displayName || 'You') : u?.email || 'Unknown Roommate'),
        photoURL: u?.photoURL,
        email: u?.email,
      });
    });

    const pendingInvites = workspaceInvites.filter(
      (m) => m.teamId === workspace && m.status === 'pending',
    );
    pendingInvites.forEach((invite) => {
      const inviteeEmail = invite.inviteeEmail?.toLowerCase();
      const isAlreadyMember = allAssignees.some(
        (a) => a.email?.toLowerCase() === inviteeEmail || a.uid === invite.inviteeEmail,
      );
      if (!isAlreadyMember) {
        allAssignees.push({
          uid: invite.inviteeEmail,
          name: invite.inviteeEmail,
          isPending: true,
        });
      }
    });
  }

  const handleAcceptInvite = async (invite) => {
    try {
      await updateDoc(doc(db, 'teams', invite.teamId), {
        members: arrayUnion(user.uid),
      });
      await updateDoc(doc(db, 'teamInvites', invite.id), {
        status: 'accepted',
      });
      setWorkspace(invite.teamId);
    } catch (err) {
      console.error('Error accepting invite:', err);
    }
  };

  const handleDeclineInvite = async (invite) => {
    try {
      await updateDoc(doc(db, 'teamInvites', invite.id), {
        status: 'declined',
      });
    } catch (err) {
      console.error('Error declining invite:', err);
    }
  };

  let filteredTasks = tasks;
  if (filterRoom !== 'All') {
    filteredTasks = filteredTasks.filter((t) => t.room === filterRoom);
  }
  if (filterPriority !== 'All') {
    filteredTasks = filteredTasks.filter((t) => t.priority === filterPriority);
  }
  if (filterAssignee !== 'All') {
    filteredTasks = filteredTasks.filter(
      (t) => t.assignedTo === filterAssignee,
    );
  }
  if (filterDate !== 'All') {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(
      startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    filteredTasks = filteredTasks.filter((t) => {
      if (filterDate === 'none') return !t.dueDate;
      if (filterDate === 'overdue') return isOverdue(t);
      if (!t.dueDate) return false;
      const due = parseDueDate(t.dueDate);
      if (filterDate === 'today') {
        return due >= startOfToday && due < endOfToday;
      }
      if (filterDate === 'week') return due >= startOfToday && due < endOfWeek;
      return true;
    });
  }

  const workspaceTasks = filteredTasks.filter((t) => {
    if (workspace === 'personal') {
      return (t.workspace === 'personal' || !t.workspace) && t.ownerUid === user.uid;
    }
    return t.workspace === workspace;
  });

  const activeFilterCount = [
    filterDate !== 'All',
    filterRoom !== 'All',
    filterAssignee !== 'All',
    filterPriority !== 'All',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilterDate('All');
    setFilterRoom('All');
    setFilterAssignee('All');
    setFilterPriority('All');
    setExpandedFilterType(null);
  };

  const toggleFilterType = (type) => {
    setExpandedFilterType(expandedFilterType === type ? null : type);
  };

  const handleDismissReminder = (taskId) => {
    setDismissedReminders((prev) => ({ ...prev, [taskId]: true }));
  };

  const dueSoonTasks = tasks.filter((t) => {
    const remindersEnabled = activeTeam?.preferences?.taskRemindersEnabled ?? true;
    if (!remindersEnabled) return false;

    const advanceMs = activeTeam?.preferences?.reminderAdvanceMs ?? (30 * 60 * 1000);
    return (
      isDueWithinWindow(t, advanceMs, {
        quietHours: activeTeam?.preferences?.quietHours ?? false,
        quietHoursStart: activeTeam?.preferences?.quietHoursStart,
        quietHoursEnd: activeTeam?.preferences?.quietHoursEnd,
      }) && !dismissedReminders[t.id]
    );
  });
  void now;

  return (
    <div className="min-h-screen bg-[#F3F9F7] flex flex-col md:flex-row">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-10">
        <Header
          user={user}
          usersMap={usersMap}
          workspace={workspace}
          setWorkspace={setWorkspace}
          teams={teams}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSignOut={() => setUser(null)}
        />

        {myPendingInvites.map((invite) => (
          <InviteBanner
            key={invite.id}
            invite={invite}
            inviterName={usersMap[invite.inviterUid]?.displayName || 'Someone'}
            onAccept={() => handleAcceptInvite(invite)}
            onDecline={() => handleDeclineInvite(invite)}
          />
        ))}

        {dueSoonTasks.map((task) => (
          <ReminderBanner
            key={task.id}
            task={task}
            onDismiss={handleDismissReminder}
          />
        ))}

        {!SETTINGS_TAB_IDS.includes(activeTab) && (
          <div className="mx-4 md:mx-8 mt-5 p-5 bg-white border border-emerald-100 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">Active Workspace</span>
              <div className="flex items-center gap-2 mt-0.5">
                {workspace === 'personal' ? (
                  <>
                    <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                      <Home size={18} strokeWidth={2.2} />
                    </div>
                    <h2 className="text-lg font-extrabold text-teal-950 tracking-tight">Personal Tasks</h2>
                  </>
                ) : (
                  <>
                    <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                      <Users size={18} strokeWidth={2.2} />
                    </div>
                    <h2 className="text-lg font-extrabold text-teal-950 tracking-tight">
                      {activeTeam?.name || 'Loading Team...'}
                    </h2>
                  </>
                )}
              </div>
            </div>

            {workspace !== 'personal' && allAssignees.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400">Roommates:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {allAssignees.map((assignee) => (
                    <div
                      key={assignee.uid}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        assignee.isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50/80 text-teal-950 border-emerald-100'
                      }`}
                      title={`${assignee.name}${assignee.isPending ? ' (Pending Invite)' : ''}`}
                    >
                      <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-extrabold overflow-hidden">
                        {assignee.photoURL ? (
                          <img src={assignee.photoURL} alt="" className="h-full w-full object-cover" />
                        ) : (
                          assignee.name?.[0] || '?'
                        )}
                      </div>
                      <span className="truncate max-w-[100px]">{assignee.name}</span>
                      {assignee.isPending && (
                        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100/70 px-1 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <main className="flex-1">
          {activeTab === 'profile' && (
            <UserProfile
              user={user}
              profile={usersMap[user.uid]}
              onProfileSave={(displayName) =>
                setUser((prev) => ({ ...prev, displayName }))
              }
            />
          )}

          {activeTab === 'preferences' && (
            <Preferences
              user={user}
              profile={usersMap[user.uid]}
              teams={teams}
              workspace={workspace}
              onUpdateProfile={(updatedPrefs) => {
                setUsersMap((prev) => ({
                  ...prev,
                  [user.uid]: {
                    ...prev[user.uid],
                    preferences: {
                      ...prev[user.uid]?.preferences,
                      ...updatedPrefs,
                    },
                  },
                }));
              }}
              onUpdateTeam={(teamId, updatedTeamPrefs) => {
                setTeams((prev) =>
                  prev.map((t) =>
                    t.id === teamId
                      ? {
                          ...t,
                          preferences: {
                            ...t.preferences,
                            ...updatedTeamPrefs,
                          },
                        }
                      : t,
                  ),
                );
              }}
            />
          )}

          {activeTab === 'history' && (
            <History user={user} workspace={workspace} tasks={tasks} />
          )}

          {activeTab === 'tasks' && (
            <>
              <TaskForm
                user={user}
                allAssignees={allAssignees}
                workspace={workspace}
                rooms={rooms}
                autoAssign={activeTeam?.preferences?.autoAssign}
                tasks={tasks}
                onAddTask={handleAddTask}
              />

              <div className="px-4 md:px-8 py-3 flex items-center gap-3">
                <div className="relative inline-block" ref={filterMenuRef}>
                  <button
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      activeFilterCount > 0
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    <Filter size={14} />
                    <span>Filter Tasks</span>
                    {activeFilterCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown size={13} />
                  </button>

                  {showFilterMenu && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-emerald-100 shadow-xl p-3 z-30 animate-fade-in divide-y divide-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">Filters</span>
                        {activeFilterCount > 0 && (
                          <button
                            className="text-[11px] font-bold text-rose-600 hover:underline"
                            onClick={clearAllFilters}
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {/* Date Filter */}
                      <div className="pt-2">
                        <button
                          className="w-full text-left flex items-center justify-between py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700"
                          onClick={() => toggleFilterType('date')}
                        >
                          <span>Date Due</span>
                          <span className="text-[11px] font-normal text-slate-400">
                            {filterDate !== 'All' ? filterDate : 'All'}
                          </span>
                        </button>
                        {expandedFilterType === 'date' && (
                          <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="All">All Dates</option>
                            {FILTER_DATE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Area Filter */}
                      <div className="pt-2">
                        <button
                          className="w-full text-left flex items-center justify-between py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700"
                          onClick={() => toggleFilterType('area')}
                        >
                          <span>Room / Space</span>
                          <span className="text-[11px] font-normal text-slate-400">
                            {filterRoom !== 'All' ? filterRoom : 'All'}
                          </span>
                        </button>
                        {expandedFilterType === 'area' && (
                          <select
                            value={filterRoom}
                            onChange={(e) => setFilterRoom(e.target.value)}
                            className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="All">All Rooms</option>
                            {rooms.map((room) => (
                              <option key={room} value={room}>
                                {room}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Assignee Filter */}
                      <div className="pt-2">
                        <button
                          className="w-full text-left flex items-center justify-between py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700"
                          onClick={() => toggleFilterType('assignee')}
                        >
                          <span>Assigned To</span>
                          <span className="text-[11px] font-normal text-slate-400 truncate max-w-[100px]">
                            {filterAssignee !== 'All'
                              ? allAssignees.find((a) => a.uid === filterAssignee)?.name || filterAssignee
                              : 'All'}
                          </span>
                        </button>
                        {expandedFilterType === 'assignee' && (
                          <select
                            value={filterAssignee}
                            onChange={(e) => setFilterAssignee(e.target.value)}
                            className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="All">All Assignees</option>
                            {allAssignees.map((a) => (
                              <option key={a.uid} value={a.uid}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Priority Filter */}
                      <div className="pt-2">
                        <button
                          className="w-full text-left flex items-center justify-between py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700"
                          onClick={() => toggleFilterType('priority')}
                        >
                          <span>Priority</span>
                          <span className="text-[11px] font-normal text-slate-400">
                            {filterPriority !== 'All' ? filterPriority : 'All'}
                          </span>
                        </button>
                        {expandedFilterType === 'priority' && (
                          <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="All">All Priorities</option>
                            {FILTER_PRIORITIES.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {activeFilterCount > 0 && (
                  <button
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                    onClick={clearAllFilters}
                  >
                    <X size={14} />
                    <span>Clear filters</span>
                  </button>
                )}
              </div>

              <TaskList
                tasks={workspaceTasks}
                currentUser={user}
                allAssignees={allAssignees}
                completedWindowMs={completedWindowMs}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            </>
          )}

          {activeTab === 'inventory' && (
            <Inventory user={user} workspace={workspace} />
          )}

          {activeTab === 'living-space' && (
            <LivingSpace rooms={rooms} workspace={workspaceDocId} />
          )}

          {activeTab === 'stats' && (
            <StatsPanel
              tasks={tasks}
              currentUser={user}
              workspace={workspace}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
