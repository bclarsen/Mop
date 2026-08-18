// TEST

import { useState } from 'react';
import { Settings, X, Plus, Users, UserPlus, LogOut, Check, AlertCircle, Bell, UserCheck, ClipboardList, CheckCheck, Trash2, Clock } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useClickOutside } from '../hooks/useClickOutside';
import { SETTINGS_PAGES } from '../constants/settings';
import { formatDueDate } from '../utils/dateHelpers';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  arrayRemove,
  getDocs,
  query,
  where
} from 'firebase/firestore';

const teamsRef = collection(db, 'teams');
const invitesRef = collection(db, 'teamInvites');

function Header({
  user,
  usersMap,
  workspace,
  setWorkspace,
  teams,
  setActiveTab,
  notifications = [],
  onMarkNotificationRead,
  onDeleteNotification,
  onMarkAllNotificationsAsRead,
  onSignOut,
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
    if (onSignOut) {
      onSignOut();
    }
  };

  const [isNamingTeam, setIsNamingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const [showManageMenu, setShowManageMenu] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const containerRef = useClickOutside(() => setShowInvite(false));
  const manageMenuRef = useClickOutside(() => setShowManageMenu(false));
  const settingsMenuRef = useClickOutside(() => setShowSettingsMenu(false));
  const notifMenuRef = useClickOutside(() => setShowNotifMenu(false));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleWorkspaceChange = (teamId) => {
    setWorkspace(teamId);
    setShowManageMenu(false);
    setShowAddMembers(false);
    setInviteStatus(null);
  };

  const currentTeam = teams.find((t) => t.id === workspace);
  const isCreator = currentTeam?.createdBy === user?.uid;

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || teams.length >= 5) return;
    try {
      if (!user?.isDemo) {
        const docRef = await addDoc(teamsRef, {
          name: newTeamName.trim(),
          members: [user.uid],
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        setWorkspace(docRef.id);
      } else {
        const fakeId = `demo-team-${Date.now()}`;
        setWorkspace(fakeId);
      }
      setNewTeamName('');
      setIsNamingTeam(false);
    } catch (err) {
      console.error('Error creating team:', err);
    }
  };

  const handleCancelAddTeam = () => {
    setNewTeamName('');
    setIsNamingTeam(false);
  };

  const handleRemoveMember = async (uid) => {
    if (!currentTeam || uid === user?.uid) return;
    try {
      await updateDoc(doc(db, 'teams', workspace), {
        members: arrayRemove(uid),
      });
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleLeaveTeam = async () => {
    if (workspace === 'personal' || !currentTeam) return;
    if (isCreator) return;

    const confirmed = window.confirm(`Leave "${currentTeam.name}"?`);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'teams', workspace), {
        members: arrayRemove(user.uid),
      });
      setWorkspace('personal');
      setShowManageMenu(false);
    } catch (err) {
      console.error('Error leaving team:', err);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || workspace === 'personal') return;
    if (!currentTeam) return;

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const alreadyMember = (currentTeam.members || []).some(
        (uid) => usersMap[uid]?.email?.toLowerCase() === normalizedEmail
    );

    if (alreadyMember) {
      setInviteStatus({
        type: 'error',
        message: 'This person is already on the team.',
      });
      return;
    }

    try {
      if (!user?.isDemo) {
        const existing = await getDocs(query(
            invitesRef,
            where('teamId', '==', workspace),
            where('inviteeEmail', '==', normalizedEmail),
            where('status', '==', 'pending'),
        ));
        if (!existing.empty) {
          setInviteStatus({
            type: 'error',
            message: 'This person already has a pending invite.',
          });
          return;
        }

        await addDoc(invitesRef, {
          teamId: workspace,
          teamName: currentTeam.name,
          inviterUid: user.uid,
          inviteeEmail: normalizedEmail,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      }
      setInviteStatus({
        type: 'success',
        message: `Invite sent to ${inviteEmail}`,
      });
      setInviteEmail('');
    } catch (err) {
      console.error('Invite error:', err);
      setInviteStatus({
        type: 'error',
        message: 'Could not send invite. Try again.',
      });
    }
  };

  const handleCancelInvite = () => {
    setShowAddMembers(false);
    setInviteEmail('');
    setInviteStatus(null);
  };

  const handleDeleteTeam = async () => {
    if (workspace === 'personal' || !currentTeam) return;
    if (!isCreator) return;

    const confirmed = window.confirm(
      `Delete "${currentTeam.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'teams', workspace));
      setWorkspace('personal');
      setShowManageMenu(false);
    } catch (err) {
      console.error('Delete team error:', err);
    }
  };

  return (
    <div ref={containerRef} className="relative z-30">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-100/90 px-4 md:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-200 text-teal-950 hover:bg-emerald-50 text-xs md:text-sm font-semibold shadow-xs transition-all hover:border-emerald-300 active:scale-95"
            onClick={() => setShowInvite(!showInvite)}
          >
            <Users size={15} className="text-emerald-600" />
            <span>Teams & Workspaces</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications Bell */}
          <div className="relative shrink-0 z-50" ref={notifMenuRef}>
            <button
              className="relative p-2 rounded-xl text-slate-500 hover:text-teal-950 hover:bg-emerald-50/80 transition-all active:scale-95 cursor-pointer"
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowSettingsMenu(false);
              }}
              title="Notifications"
            >
              <Bell size={20} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl border border-emerald-100 shadow-xl py-2 z-50 overflow-hidden animate-fade-in divide-y divide-slate-100">
                <div className="px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-teal-950">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && onMarkAllNotificationsAsRead && (
                    <button
                      type="button"
                      onClick={() => onMarkAllNotificationsAsRead()}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck size={13} />
                      <span>Mark all as read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Bell size={28} strokeWidth={1.5} className="text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">No notifications yet</p>
                      <p className="text-[11px] text-slate-400">You will be notified about task assignments and due dates.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isAssigned = notif.type === 'task_assigned';
                      const isDueReminder = notif.type === 'due_date_reminder';
                      const isOverdue = notif.isOverdue;

                      return (
                        <div
                          key={notif.id}
                          className={`p-3.5 flex items-start justify-between gap-3 transition-colors hover:bg-slate-50 cursor-pointer ${
                            !notif.read
                              ? isDueReminder && isOverdue
                                ? 'bg-amber-50/60'
                                : 'bg-emerald-50/40'
                              : 'bg-white'
                          }`}
                          onClick={() => {
                            if (onMarkNotificationRead) onMarkNotificationRead(notif.id);
                            if (notif.teamId && notif.teamId !== workspace) {
                              setWorkspace(notif.teamId);
                            }
                            setActiveTab('tasks');
                            setShowNotifMenu(false);
                          }}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isDueReminder
                                ? isOverdue
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                                : isAssigned
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}>
                              {isDueReminder ? (
                                isOverdue ? (
                                  <AlertCircle size={14} strokeWidth={2.5} />
                                ) : (
                                  <Clock size={14} strokeWidth={2.5} />
                                )
                              ) : isAssigned ? (
                                <UserCheck size={14} strokeWidth={2.5} />
                              ) : (
                                <ClipboardList size={14} strokeWidth={2.5} />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              {isDueReminder ? (
                                <>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                      isOverdue ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                                    }`}>
                                      {isOverdue ? 'Overdue' : 'Due Reminder'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-800 leading-snug mt-0.5">
                                    <strong className="font-bold text-teal-950">&quot;{notif.taskName}&quot;</strong>
                                    {isOverdue ? ' was due ' : ' is due '}
                                    <span className={isOverdue ? 'font-bold text-amber-800' : 'font-medium text-slate-700'}>
                                      {notif.dueDate ? formatDueDate(notif.dueDate) : 'today'}
                                    </span>
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-800 leading-snug">
                                  <strong className="font-bold text-teal-950">{notif.actorName || 'Teammate'}</strong>
                                  {isAssigned ? ' assigned you ' : ' added unassigned task '}
                                  <strong className="font-bold text-teal-950">&quot;{notif.taskName}&quot;</strong>
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                                <span>{notif.teamName || 'Team'}</span>
                                {notif.room && (
                                  <>
                                    <span>·</span>
                                    <span>{notif.room}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!notif.read && (
                              <span
                                className={`h-2 w-2 rounded-full ${isDueReminder && isOverdue ? 'bg-amber-600' : 'bg-emerald-600'}`}
                                title="Unread"
                              />
                            )}
                            {onDeleteNotification && (
                              <button
                                type="button"
                                onClick={() => onDeleteNotification(notif.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Remove notification"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative shrink-0 z-50" ref={settingsMenuRef}>
            <button
              className="p-2 rounded-xl text-slate-500 hover:text-teal-950 hover:bg-emerald-50/80 transition-all active:scale-95"
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setShowNotifMenu(false);
              }}
              title="Settings"
            >
              <Settings size={20} strokeWidth={2} />
            </button>

            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-emerald-100 shadow-xl py-1.5 z-50 overflow-hidden animate-fade-in divide-y divide-slate-100">
                <div className="py-1">
                  {SETTINGS_PAGES.map(({ id, label }) => (
                    <button
                      key={id}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center justify-between"
                      onClick={() => {
                        setActiveTab(id);
                        setShowSettingsMenu(false);
                      }}
                    >
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Teams Dropdown Drawer / Panel */}
      {showInvite && (
        <div className="relative z-10 mx-4 md:mx-8 my-4 p-5 bg-white border border-emerald-200/90 rounded-2xl shadow-md animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Workspaces:</span>
              {teams.map((team) => {
                const isActive = workspace === team.id;
                return (
                  <button
                    key={team.id}
                    className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50/70 text-teal-900 hover:bg-emerald-100 border border-emerald-200/60'
                    }`}
                    onClick={() => handleWorkspaceChange(team.id)}
                  >
                    {team.name}
                  </button>
                );
              })}

              {teams.length < 5 && !isNamingTeam && (
                <button
                  className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                  onClick={() => setIsNamingTeam(true)}
                  title="Create new household team"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {workspace !== 'personal' && (
              <div className="relative shrink-0 self-start md:self-auto" ref={manageMenuRef}>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setShowManageMenu(!showManageMenu)}
                >
                  <span>Team Options</span>
                </button>

                {showManageMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-30 divide-y divide-slate-100 animate-fade-in">
                    <button
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      onClick={() => {
                        setShowAddMembers(true);
                        setShowManageMenu(false);
                      }}
                    >
                      Team Members & Invites
                    </button>
                    {isCreator ? (
                      <button
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        onClick={handleDeleteTeam}
                      >
                        Delete Team
                      </button>
                    ) : (
                      <button
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                        onClick={handleLeaveTeam}
                      >
                        Leave Team
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {isNamingTeam && (
            <div className="mt-4 flex flex-wrap items-center gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
              <input
                type="text"
                placeholder="Team Name (e.g. Apartment 4B)"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <button
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                onClick={handleAddTeam}
                disabled={!newTeamName.trim()}
              >
                Create Team
              </button>
              <button
                className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
                onClick={handleCancelAddTeam}
              >
                Cancel
              </button>
            </div>
          )}

          {showAddMembers && workspace !== 'personal' && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Members:</h4>
                <div className="flex flex-wrap gap-2">
                  {(currentTeam?.members || []).map((uid) => {
                    const member = usersMap[uid];
                    const isSelf = uid === user?.uid;
                    return (
                      <div
                        key={uid}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                      >
                        <span>{member?.displayName || (isSelf ? `${user?.displayName || 'You'}` : uid)}</span>
                        {isCreator && !isSelf && (
                          <button
                            className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove member"
                            onClick={() => handleRemoveMember(uid)}
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-teal-900">
                  <UserPlus size={15} />
                  <span>Invite a Roommate via Email</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="email"
                    placeholder="roommate@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 min-w-[220px] px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                    onClick={handleInvite}
                  >
                    Send Invite
                  </button>
                  <button
                    className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
                    onClick={handleCancelInvite}
                  >
                    Close
                  </button>
                </div>
                {inviteStatus && (
                  <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                    inviteStatus.type === 'success' ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {inviteStatus.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{inviteStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Header;
