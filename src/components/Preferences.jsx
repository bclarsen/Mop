import { useState } from 'react';
import {
  Save,
  Check,
  AlertCircle,
  Bell,
  Shuffle,
  User,
  Users,
  Clock,
  Moon,
  Sun,
  Monitor,
  Mail,
  UserPlus,
  UserCheck,
  CheckCheck,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CustomSelect } from './CustomSelect';
import {
  COMPLETED_WINDOW_OPTIONS,
  DEFAULT_COMPLETED_WINDOW_MS,
  MIN_REMINDER_ADVANCE_MS,
  formatDuration,
  msToParts,
} from '../utils/dateHelpers';
import { applyTheme, getInitialTheme } from '../utils/theme';

function CompletedWindowControl({
  value,
  onChange,
  disabled = false,
  idPrefix = 'pref',
}) {
  const isPreset = COMPLETED_WINDOW_OPTIONS.some((opt) => opt.value === value);
  const [mode, setMode] = useState(() => (isPreset ? String(value) : 'custom'));

  const initialParts = msToParts(value || DEFAULT_COMPLETED_WINDOW_MS);
  const [customHours, setCustomHours] = useState(() => initialParts.totalHours || 0);
  const [customSeconds, setCustomSeconds] = useState(() => initialParts.totalSecondsRemaining || 0);

  const handleDropdownChange = (newMode) => {
    setMode(newMode);
    if (newMode !== 'custom') {
      const numMs = Number(newMode);
      onChange(numMs);
    } else {
      const ms = Math.max(1000, (Number(customHours) * 3600 + Number(customSeconds)) * 1000);
      onChange(ms);
    }
  };

  const handleHoursChange = (h) => {
    const val = Math.max(0, parseInt(h, 10) || 0);
    setCustomHours(val);
    const ms = Math.max(1000, (val * 3600 + Number(customSeconds)) * 1000);
    onChange(ms);
  };

  const handleSecondsChange = (s) => {
    const val = Math.max(0, parseInt(s, 10) || 0);
    setCustomSeconds(val);
    const ms = Math.max(1000, (Number(customHours) * 3600 + val) * 1000);
    onChange(ms);
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`${idPrefix}-completed-window`}
        className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5"
      >
        <Clock size={14} className="text-emerald-600 dark:text-emerald-400" />
        <span>Completed Tasks Visible For</span>
      </label>
      <CustomSelect
        id={`${idPrefix}-completed-window`}
        value={mode}
        disabled={disabled}
        onChange={handleDropdownChange}
        options={[
          ...COMPLETED_WINDOW_OPTIONS,
          { value: 'custom', label: 'Custom' }
        ]}
      />

      {mode === 'custom' && (
        <div className="p-3.5 bg-emerald-50/70 dark:bg-[#1C2C27]/70 border border-emerald-200/90 dark:border-[#253D36] rounded-2xl flex flex-col gap-3 animate-fade-in">
          <div className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4]">Specify Custom Time:</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-hours`} className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Hours
              </label>
              <input
                id={`${idPrefix}-hours`}
                type="number"
                min="0"
                max="9999"
                disabled={disabled}
                value={customHours}
                onChange={(e) => handleHoursChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] rounded-lg text-sm text-slate-800 dark:text-[#F0FDF4] focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-seconds`} className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Seconds
              </label>
              <input
                id={`${idPrefix}-seconds`}
                type="number"
                min="0"
                max="59"
                disabled={disabled}
                value={customSeconds}
                onChange={(e) => handleSecondsChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] rounded-lg text-sm text-slate-800 dark:text-[#F0FDF4] focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
                placeholder="0"
              />
            </div>
          </div>
          <div className="text-[11px] text-emerald-900 dark:text-emerald-200 bg-white/90 dark:bg-[#15221E] border border-emerald-200/60 dark:border-[#253D36] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Tasks will disappear after:</span>
            <strong className="font-extrabold text-emerald-800 dark:text-emerald-300">
              {formatDuration((customHours * 3600 + customSeconds) * 1000)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamPreferencesForm({ activeTeam, isTeamCreator, user, onUpdateTeam }) {
  const [teamAutoAssign, setTeamAutoAssign] = useState(
    () => activeTeam?.preferences?.autoAssign || 'manual',
  );
  const [teamCompletedWindowMs, setTeamCompletedWindowMs] = useState(
    () => activeTeam?.preferences?.completedWindowMs ?? DEFAULT_COMPLETED_WINDOW_MS,
  );
  const [remindersEnabled, setRemindersEnabled] = useState(
    () => activeTeam?.preferences?.taskRemindersEnabled ?? true,
  );
  const [reminderAdvanceMinutes, setReminderAdvanceMinutes] = useState(
    () => Math.round((activeTeam?.preferences?.reminderAdvanceMs ?? (30 * 60 * 1000)) / 60000),
  );
  const [quietHours, setQuietHours] = useState(
    () => activeTeam?.preferences?.quietHours ?? false,
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    () => activeTeam?.preferences?.quietHoursStart || '22:00',
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    () => activeTeam?.preferences?.quietHoursEnd || '07:00',
  );

  const [emailTeamInvites, setEmailTeamInvites] = useState(
    () => activeTeam?.preferences?.emailTeamInvites ?? true,
  );
  const [emailTaskCompletions, setEmailTaskCompletions] = useState(
    () => activeTeam?.preferences?.emailTaskCompletions ?? true,
  );
  const [emailTaskAssignments, setEmailTaskAssignments] = useState(
    () => activeTeam?.preferences?.emailTaskAssignments ?? true,
  );

  const [savingTeam, setSavingTeam] = useState(false);
  const [teamStatus, setTeamStatus] = useState(null);

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!activeTeam || activeTeam.id === 'personal') return;

    setSavingTeam(true);
    setTeamStatus(null);
    try {
      const advanceMs = Math.max(
        MIN_REMINDER_ADVANCE_MS,
        (Number(reminderAdvanceMinutes) || 30) * 60000,
      );

      const teamPrefs = {
        autoAssign: teamAutoAssign,
        completedWindowMs: Number(teamCompletedWindowMs),
        taskRemindersEnabled: remindersEnabled,
        reminderAdvanceMs: advanceMs,
        quietHours,
        quietHoursStart,
        quietHoursEnd,
        emailTeamInvites,
        emailTaskCompletions,
        emailTaskAssignments,
      };

      if (!user?.isDemo) {
        await setDoc(
          doc(db, 'teams', activeTeam.id),
          {
            preferences: teamPrefs,
          },
          { merge: true },
        );
      }

      if (onUpdateTeam) {
        onUpdateTeam(activeTeam.id, teamPrefs);
      }

      setTeamStatus({ type: 'success', message: 'Team settings saved. Completed tasks will archive according to this timeframe.' });
    } catch (err) {
      console.error('Error saving team prefs:', err);
      setTeamStatus({ type: 'error', message: 'Failed to save team settings.' });
    } finally {
      setSavingTeam(false);
    }
  };

  return (
    <form onSubmit={handleSaveTeam} className="flex flex-col gap-6">
      {/* Section 1: Task Assignment & Visibility */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
            <Shuffle size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Auto-Assign Mode</span>
          </label>
          <CustomSelect
            value={teamAutoAssign}
            disabled={!isTeamCreator}
            onChange={setTeamAutoAssign}
            options={[
              { value: 'manual', label: 'Manual Assignment' },
              { value: 'rotate', label: 'Automatic Fair Rotation' },
            ]}
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Automatically distribute new tasks evenly among roommates or keep manual control.
          </span>
        </div>

        <CompletedWindowControl
          idPrefix="team"
          value={teamCompletedWindowMs}
          disabled={!isTeamCreator}
          onChange={(newMs) => setTeamCompletedWindowMs(newMs)}
        />
      </div>

      {/* Section 2: Due Date Notifications & Quiet Hours */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-[#213630]">
        <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
          <Bell size={14} className="text-amber-500 dark:text-amber-400" />
          <span>In-App Task Reminders</span>
        </label>

        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#1C2C27] rounded-xl border border-slate-200 dark:border-[#253D36]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4]">
              Task Due Date Alerts
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Show alerts in the in-app notification center when task deadlines approach
            </span>
          </div>
          <input
            type="checkbox"
            checked={remindersEnabled}
            disabled={!isTeamCreator}
            onChange={(e) => setRemindersEnabled(e.target.checked)}
            className="h-4 w-4 text-emerald-600 dark:text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        {remindersEnabled && (
          <div className="flex flex-col gap-3 p-4 bg-slate-50/70 dark:bg-[#1C2C27]/60 rounded-xl border border-slate-200/80 dark:border-[#253D36] animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notify In Advance (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={reminderAdvanceMinutes}
                  disabled={!isTeamCreator}
                  onChange={(e) => setReminderAdvanceMinutes(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] text-slate-800 dark:text-[#F0FDF4] rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  E.g. 30 for 30m, 60 for 1h, 1440 for 24h
                </span>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="quietHours"
                  checked={quietHours}
                  disabled={!isTeamCreator}
                  onChange={(e) => setQuietHours(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="quietHours" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Quiet Hours (hold overnight alerts)
                </label>
              </div>
            </div>

            {quietHours && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-[#253D36]">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Quiet Start</label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    disabled={!isTeamCreator}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] text-slate-800 dark:text-[#F0FDF4] rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Quiet End</label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    disabled={!isTeamCreator}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] text-slate-800 dark:text-[#F0FDF4] rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Email Notifications (Firebase Trigger Email) */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-[#213630]">
        <div className="flex flex-col gap-0.5">
          <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
            <Mail size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Allow email notifications for:</span>
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Automatically sends email updates to team members via Firebase Trigger Email
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Team Invites */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#1C2C27] rounded-xl border border-slate-200 dark:border-[#253D36] hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-[#15221E] text-emerald-700 dark:text-emerald-400">
                <UserPlus size={15} />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="emailTeamInvites"
                  className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] cursor-pointer"
                >
                  Team Invites
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notify invited roommates by email with joining instructions
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="emailTeamInvites"
              checked={emailTeamInvites}
              disabled={!isTeamCreator}
              onChange={(e) => setEmailTeamInvites(e.target.checked)}
              className="h-4 w-4 text-emerald-600 dark:text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Task Completions */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#1C2C27] rounded-xl border border-slate-200 dark:border-[#253D36] hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-[#15221E] text-emerald-700 dark:text-emerald-400">
                <CheckCheck size={15} />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="emailTaskCompletions"
                  className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] cursor-pointer"
                >
                  Task Completions
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notify all workspace members when a task is completed
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="emailTaskCompletions"
              checked={emailTaskCompletions}
              disabled={!isTeamCreator}
              onChange={(e) => setEmailTaskCompletions(e.target.checked)}
              className="h-4 w-4 text-emerald-600 dark:text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Task Assignations */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#1C2C27] rounded-xl border border-slate-200 dark:border-[#253D36] hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-[#15221E] text-emerald-700 dark:text-emerald-400">
                <UserCheck size={15} />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="emailTaskAssignments"
                  className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] cursor-pointer"
                >
                  Task Assignations
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notify members when assigned a chore or when unassigned tasks are created
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="emailTaskAssignments"
              checked={emailTaskAssignments}
              disabled={!isTeamCreator}
              onChange={(e) => setEmailTaskAssignments(e.target.checked)}
              className="h-4 w-4 text-emerald-600 dark:text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Status feedback message */}
      {teamStatus && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
            teamStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {teamStatus.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{teamStatus.message}</span>
        </div>
      )}

      {/* Save Action */}
      {isTeamCreator && (
        <div className="pt-2">
          <button
            type="submit"
            disabled={savingTeam}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{savingTeam ? 'Saving...' : 'Save Team Rules'}</span>
          </button>
        </div>
      )}
    </form>
  );
}

function Preferences({ user, profile, teams = [], workspace, onUpdateProfile, onUpdateTeam }) {
  const isPersonal = workspace === 'personal';
  const availableTeams = teams.filter((t) => t.id !== 'personal');

  const [prefScope, setPrefScope] = useState(() => (isPersonal ? 'personal' : 'team'));
  const currentScope = isPersonal ? 'personal' : prefScope;
  const [selectedTeamId, setSelectedTeamId] = useState(() => (!isPersonal ? workspace : (availableTeams[0]?.id || '')));

  const activeTeam = teams.find((t) => t.id === (!isPersonal ? workspace : selectedTeamId)) || teams.find((t) => t.id === workspace);
  const isTeamCreator = activeTeam?.createdBy === user?.uid;

  // Personal preferences
  const [theme, setTheme] = useState(() => profile?.preferences?.theme || getInitialTheme() || 'light');
  const [defaultWorkspace, setDefaultWorkspace] = useState(
    () => profile?.preferences?.defaultWorkspace || 'personal',
  );
  const [personalCompletedWindowMs, setPersonalCompletedWindowMs] = useState(
    () => profile?.preferences?.completedWindowMs ?? DEFAULT_COMPLETED_WINDOW_MS,
  );
  const [personalRemindersEnabled, setPersonalRemindersEnabled] = useState(
    () => profile?.preferences?.taskRemindersEnabled ?? true,
  );
  const [personalReminderAdvanceMinutes, setPersonalReminderAdvanceMinutes] = useState(
    () => Math.round((profile?.preferences?.reminderAdvanceMs ?? (30 * 60 * 1000)) / 60000),
  );
  const [personalQuietHours, setPersonalQuietHours] = useState(
    () => profile?.preferences?.quietHours ?? false,
  );
  const [personalQuietHoursStart, setPersonalQuietHoursStart] = useState(
    () => profile?.preferences?.quietHoursStart || '22:00',
  );
  const [personalQuietHoursEnd, setPersonalQuietHoursEnd] = useState(
    () => profile?.preferences?.quietHoursEnd || '07:00',
  );

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalStatus, setPersonalStatus] = useState(null);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    setPersonalStatus(null);
    try {
      const advanceMs = Math.max(
        MIN_REMINDER_ADVANCE_MS,
        (Number(personalReminderAdvanceMinutes) || 30) * 60000,
      );

      const updatedPrefs = {
        theme,
        defaultWorkspace,
        completedWindowMs: Number(personalCompletedWindowMs),
        taskRemindersEnabled: personalRemindersEnabled,
        reminderAdvanceMs: advanceMs,
        quietHours: personalQuietHours,
        quietHoursStart: personalQuietHoursStart,
        quietHoursEnd: personalQuietHoursEnd,
      };

      // Ensure theme is applied
      applyTheme(theme);

      if (!user?.isDemo) {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            preferences: updatedPrefs,
          },
          { merge: true },
        );
      }

      if (onUpdateProfile) {
        onUpdateProfile(updatedPrefs);
      }

      setPersonalStatus({ type: 'success', message: 'Personal preferences saved. Theme and notification settings applied.' });
    } catch (err) {
      console.error('Error saving personal prefs:', err);
      setPersonalStatus({ type: 'error', message: 'Failed to save preferences.' });
    } finally {
      setSavingPersonal(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 w-full max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 dark:text-[#F0FDF4] tracking-tight">Preferences & Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Customize your workflow, color theme, and household automation rules.</p>
        </div>

        {/* Personal vs Team Toggle - Only shown in team workspaces */}
        {!isPersonal && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#1C2C27] rounded-2xl border border-slate-200/90 dark:border-[#253D36] w-fit">
            <button
              type="button"
              onClick={() => setPrefScope('personal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                currentScope === 'personal'
                  ? 'bg-white dark:bg-[#15221E] text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User size={15} strokeWidth={2.5} />
              <span>Personal</span>
            </button>
            <button
              type="button"
              onClick={() => setPrefScope('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                currentScope === 'team'
                  ? 'bg-white dark:bg-[#15221E] text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users size={15} strokeWidth={2.5} />
              <span>Team</span>
            </button>
          </div>
        )}
      </div>

      {/* Personal Settings Card */}
      {currentScope === 'personal' && (
        <div className="bg-white dark:bg-[#15221E] border border-emerald-100 dark:border-[#213630] rounded-2xl p-6 shadow-xs animate-fade-in transition-colors">
          <h3 className="text-base font-extrabold text-teal-950 dark:text-[#F0FDF4] mb-1">Your Personal Defaults</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">These preferences only apply to your individual account.</p>

          <form onSubmit={handleSavePersonal} className="flex flex-col gap-5">
            {/* Theme Palette Selection (Option 1: Forest Night) */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-slate-100 dark:border-[#213630]">
              <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider flex items-center gap-1.5">
                <Moon size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Theme & Appearance</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Forest Night Card */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('forest_night')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    theme === 'forest_night' || theme === 'dark'
                      ? 'border-emerald-500 bg-[#0C1311] text-[#F0FDF4] ring-2 ring-emerald-500/40 shadow-sm'
                      : 'border-slate-200 dark:border-[#253D36] bg-[#0C1311]/90 text-[#F0FDF4] hover:border-emerald-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#15221E] text-emerald-400">
                        <Moon size={15} />
                      </div>
                      <span className="text-xs font-bold text-emerald-300">Forest Night</span>
                    </div>
                    {(theme === 'forest_night' || theme === 'dark') && (
                      <Check size={14} className="text-emerald-400 font-extrabold" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-4 h-4 rounded-full bg-[#0C1311] border border-[#233832]" title="Canvas (#0C1311)" />
                    <span className="w-4 h-4 rounded-full bg-[#15221E] border border-[#233832]" title="Panels (#15221E)" />
                    <span className="w-4 h-4 rounded-full bg-[#10B981]" title="Emerald Accent (#10B981)" />
                    <span className="w-4 h-4 rounded-full bg-[#F0FDF4]" title="Sage Typography (#F0FDF4)" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2">Deep pine charcoal with rich emerald accents</span>
                </button>

                {/* Clean Light Card */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    theme === 'light'
                      ? 'border-emerald-500 bg-white text-slate-900 ring-2 ring-emerald-500/40 shadow-sm'
                      : 'border-slate-200 dark:border-[#253D36] bg-white text-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                        <Sun size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Clean Light</span>
                    </div>
                    {theme === 'light' && (
                      <Check size={14} className="text-emerald-600 font-extrabold" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-4 h-4 rounded-full bg-[#F3F9F7] border border-slate-200" title="Canvas (#F3F9F7)" />
                    <span className="w-4 h-4 rounded-full bg-white border border-slate-200" title="Panels (#FFFFFF)" />
                    <span className="w-4 h-4 rounded-full bg-[#059669]" title="Mint Accent (#059669)" />
                    <span className="w-4 h-4 rounded-full bg-[#0F172A]" title="Slate Typography (#0F172A)" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2">Fresh mint and light crystal canvas</span>
                </button>

                {/* System Match Card */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('system')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    theme === 'system'
                      ? 'border-emerald-500 bg-slate-50 dark:bg-[#1C2C27] text-teal-950 dark:text-[#F0FDF4] ring-2 ring-emerald-500/40 shadow-sm'
                      : 'border-slate-200 dark:border-[#253D36] bg-slate-50/70 dark:bg-[#1C2C27]/60 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#15221E] text-slate-700 dark:text-emerald-400">
                        <Monitor size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">System Match</span>
                    </div>
                    {theme === 'system' && (
                      <Check size={14} className="text-emerald-600 dark:text-emerald-400 font-extrabold" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-6">
                    Matches your operating system preference automatically
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider">Startup Workspace</label>
              <CustomSelect
                value={defaultWorkspace}
                onChange={setDefaultWorkspace}
                options={[
                  { value: 'personal', label: 'Personal Tasks' },
                  ...teams
                    .filter((t) => t.id !== 'personal')
                    .map((t) => ({ value: t.id, label: t.name }))
                ]}
              />
            </div>

            <CompletedWindowControl
              idPrefix="personal"
              value={personalCompletedWindowMs}
              onChange={(newMs) => setPersonalCompletedWindowMs(newMs)}
            />

            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#1C2C27] rounded-xl border border-slate-200 dark:border-[#253D36]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] flex items-center gap-1.5">
                  <Bell size={14} className="text-amber-500 dark:text-amber-400" />
                  <span>Task Due Date Notifications</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Receive alerts in the notification center when personal task deadlines approach</span>
              </div>
              <input
                type="checkbox"
                checked={personalRemindersEnabled}
                onChange={(e) => setPersonalRemindersEnabled(e.target.checked)}
                className="h-4 w-4 text-emerald-600 dark:text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {personalRemindersEnabled && (
              <div className="flex flex-col gap-3 pl-4 border-l-2 border-emerald-300 dark:border-emerald-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Notify In Advance (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={personalReminderAdvanceMinutes}
                      onChange={(e) => setPersonalReminderAdvanceMinutes(e.target.value)}
                      className="px-3 py-2 bg-slate-50 dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] text-slate-800 dark:text-[#F0FDF4] rounded-lg text-sm"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      E.g. 30 for 30m, 60 for 1h, 1440 for 24h
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="personalQuietHours"
                      checked={personalQuietHours}
                      onChange={(e) => setPersonalQuietHours(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 dark:text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="personalQuietHours" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Quiet Hours (hold overnight notifications)
                    </label>
                  </div>
                </div>

                {personalQuietHours && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Quiet Start</label>
                      <input
                        type="time"
                        value={personalQuietHoursStart}
                        onChange={(e) => setPersonalQuietHoursStart(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] text-slate-800 dark:text-[#F0FDF4] rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Quiet End</label>
                      <input
                        type="time"
                        value={personalQuietHoursEnd}
                        onChange={(e) => setPersonalQuietHoursEnd(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-[#111B18] border border-slate-200 dark:border-[#253D36] text-slate-800 dark:text-[#F0FDF4] rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {personalStatus && (
              <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                personalStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {personalStatus.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{personalStatus.message}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPersonal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save size={15} />
                <span>{savingPersonal ? 'Saving...' : 'Save Personal Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Settings Card */}
      {currentScope === 'team' && !isPersonal && (
        <div className="bg-white dark:bg-[#15221E] border border-emerald-100 dark:border-[#213630] rounded-2xl p-6 shadow-xs animate-fade-in transition-colors">
          {availableTeams.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
              <Users size={36} className="text-slate-300 dark:text-slate-600 mb-1" />
              <h3 className="text-base font-extrabold text-teal-950 dark:text-[#F0FDF4]">No Team Workspace Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Create or join a team workspace using the top &quot;Teams &amp; Workspaces&quot; menu to configure shared rules.</p>
            </div>
          ) : (
            <>
              {availableTeams.length > 1 && (
                <div className="mb-5 pb-4 border-b border-slate-100 dark:border-[#213630] flex items-center gap-3">
                  <label className="text-xs font-bold text-teal-950 dark:text-[#F0FDF4] uppercase tracking-wider">Select Team:</label>
                  <CustomSelect
                    wrapperClassName="w-48"
                    value={selectedTeamId}
                    onChange={setSelectedTeamId}
                    options={availableTeams.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </div>
              )}

              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-extrabold text-teal-950 dark:text-[#F0FDF4]">Team Settings: {activeTeam?.name || 'Household'}</h3>
                {!isTeamCreator && (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    View Only (Creator controls)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Configure auto-assign, chore rotation, and reminder alerts for all members.</p>

              <TeamPreferencesForm
                key={activeTeam?.id || 'team-form'}
                activeTeam={activeTeam}
                isTeamCreator={isTeamCreator}
                user={user}
                onUpdateTeam={onUpdateTeam}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Preferences;
