import { useState } from 'react';
import { Save, Check, AlertCircle, Bell, Shuffle, User, Users, Clock } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  COMPLETED_WINDOW_OPTIONS,
  DEFAULT_COMPLETED_WINDOW_MS,
  MIN_REMINDER_ADVANCE_MS,
  formatDuration,
  msToParts,
} from '../utils/dateHelpers';

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
        className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5"
      >
        <Clock size={14} className="text-emerald-600" />
        <span>Completed Tasks Visible For</span>
      </label>
      <select
        id={`${idPrefix}-completed-window`}
        value={mode}
        disabled={disabled}
        onChange={(e) => handleDropdownChange(e.target.value)}
        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-60 cursor-pointer"
      >
        {COMPLETED_WINDOW_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>

      {mode === 'custom' && (
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl flex flex-col gap-3 animate-fade-in">
          <div className="text-xs font-bold text-teal-950">Specify Custom Time:</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-hours`} className="text-[11px] font-bold text-slate-700">
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-seconds`} className="text-[11px] font-bold text-slate-700">
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
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-60"
                placeholder="0"
              />
            </div>
          </div>
          <div className="text-[11px] text-emerald-900 bg-white/90 border border-emerald-200/60 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-slate-600 font-medium">Tasks will disappear after:</span>
            <strong className="font-extrabold text-emerald-800">
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
    <form onSubmit={handleSaveTeam} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
          <Shuffle size={14} className="text-emerald-600" />
          <span>Auto-Assign Mode</span>
        </label>
        <select
          value={teamAutoAssign}
          disabled={!isTeamCreator}
          onChange={(e) => setTeamAutoAssign(e.target.value)}
          className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-60"
        >
          <option value="manual">Manual Assignment</option>
          <option value="rotate">Automatic Fair Rotation</option>
        </select>
      </div>

      <CompletedWindowControl
        idPrefix="team"
        value={teamCompletedWindowMs}
        disabled={!isTeamCreator}
        onChange={(newMs) => setTeamCompletedWindowMs(newMs)}
      />

      <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
            <Bell size={14} className="text-amber-500" />
            <span>Task Due Date Notifications</span>
          </span>
          <span className="text-[11px] text-slate-500">Receive alerts in the notification center when a task deadline is approaching</span>
        </div>
        <input
          type="checkbox"
          checked={remindersEnabled}
          disabled={!isTeamCreator}
          onChange={(e) => setRemindersEnabled(e.target.checked)}
          className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
        />
      </div>

      {remindersEnabled && (
        <div className="flex flex-col gap-3 pl-4 border-l-2 border-emerald-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">
                Notify In Advance (minutes)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={reminderAdvanceMinutes}
                disabled={!isTeamCreator}
                onChange={(e) => setReminderAdvanceMinutes(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-400">
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
                className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="quietHours" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Quiet Hours (hold overnight notifications)
              </label>
            </div>
          </div>

          {quietHours && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">Quiet Start</label>
                <input
                  type="time"
                  value={quietHoursStart}
                  disabled={!isTeamCreator}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-600">Quiet End</label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  disabled={!isTeamCreator}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {teamStatus && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
          teamStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {teamStatus.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{teamStatus.message}</span>
        </div>
      )}

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
        defaultWorkspace,
        completedWindowMs: Number(personalCompletedWindowMs),
        taskRemindersEnabled: personalRemindersEnabled,
        reminderAdvanceMs: advanceMs,
        quietHours: personalQuietHours,
        quietHoursStart: personalQuietHoursStart,
        quietHoursEnd: personalQuietHoursEnd,
      };

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

      setPersonalStatus({ type: 'success', message: 'Personal preferences saved. Settings applied to your notification center.' });
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
          <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 tracking-tight">Preferences & Settings</h2>
          <p className="text-sm text-slate-500 mt-0.5">Customize your workflow and household automation rules.</p>
        </div>

        {/* Personal vs Team Toggle - Only shown in team workspaces */}
        {!isPersonal && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/90 w-fit">
            <button
              type="button"
              onClick={() => setPrefScope('personal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                currentScope === 'personal'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
        <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-xs animate-fade-in">
          <h3 className="text-base font-extrabold text-teal-950 mb-1">Your Personal Defaults</h3>
          <p className="text-xs text-slate-500 mb-5">These preferences only apply to your individual account.</p>

          <form onSubmit={handleSavePersonal} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Startup Workspace</label>
              <select
                value={defaultWorkspace}
                onChange={(e) => setDefaultWorkspace(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="personal">Personal Tasks</option>
                {teams
                  .filter((t) => t.id !== 'personal')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            <CompletedWindowControl
              idPrefix="personal"
              value={personalCompletedWindowMs}
              onChange={(newMs) => setPersonalCompletedWindowMs(newMs)}
            />

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Bell size={14} className="text-amber-500" />
                  <span>Task Due Date Notifications</span>
                </span>
                <span className="text-[11px] text-slate-500">Receive alerts in the notification center when personal task deadlines approach</span>
              </div>
              <input
                type="checkbox"
                checked={personalRemindersEnabled}
                onChange={(e) => setPersonalRemindersEnabled(e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {personalRemindersEnabled && (
              <div className="flex flex-col gap-3 pl-4 border-l-2 border-emerald-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">
                      Notify In Advance (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={personalReminderAdvanceMinutes}
                      onChange={(e) => setPersonalReminderAdvanceMinutes(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                    <span className="text-[10px] text-slate-400">
                      E.g. 30 for 30m, 60 for 1h, 1440 for 24h
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="personalQuietHours"
                      checked={personalQuietHours}
                      onChange={(e) => setPersonalQuietHours(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="personalQuietHours" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Quiet Hours (hold overnight notifications)
                    </label>
                  </div>
                </div>

                {personalQuietHours && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">Quiet Start</label>
                      <input
                        type="time"
                        value={personalQuietHoursStart}
                        onChange={(e) => setPersonalQuietHoursStart(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">Quiet End</label>
                      <input
                        type="time"
                        value={personalQuietHoursEnd}
                        onChange={(e) => setPersonalQuietHoursEnd(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {personalStatus && (
              <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                personalStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
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
        <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-xs animate-fade-in">
          {availableTeams.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
              <Users size={36} className="text-slate-300 mb-1" />
              <h3 className="text-base font-extrabold text-teal-950">No Team Workspace Found</h3>
              <p className="text-xs text-slate-500 max-w-sm">Create or join a team workspace using the top &quot;Teams &amp; Workspaces&quot; menu to configure shared rules.</p>
            </div>
          ) : (
            <>
              {availableTeams.length > 1 && (
                <div className="mb-5 pb-4 border-b border-slate-100 flex items-center gap-3">
                  <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Select Team:</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-extrabold text-teal-950">Team Settings: {activeTeam?.name || 'Household'}</h3>
                {!isTeamCreator && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    View Only (Creator controls)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-5">Configure auto-assign, chore rotation, and reminder alerts for all members.</p>

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
