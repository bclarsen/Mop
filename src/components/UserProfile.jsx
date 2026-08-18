import { useState } from 'react';
import { Check, AlertCircle, Save } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase';

function UserProfile({ user, profile, onProfileSave }) {
  const [displayName, setDisplayName] = useState(
    profile?.displayName || user?.displayName || '',
  );
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setStatus({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      if (user.updateProfile) {
        await updateProfile(user, { displayName: displayName.trim() });
      }

      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: displayName.trim(),
          email: user.email || '',
          photoURL: user.photoURL || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      if (onProfileSave) onProfileSave(displayName.trim());
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      console.error('Error saving profile:', err);
      setStatus({ type: 'error', message: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 w-full max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-extrabold text-teal-950 tracking-tight">Your Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage how your name and identity appear on tasks.</p>
      </div>

      <div className="bg-white border border-emerald-100/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-4 pb-6 mb-6 border-b border-slate-100">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-emerald-500/20 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              (displayName?.[0] || user?.email?.[0] || '?').toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-teal-950 text-base">{displayName || 'Cleanist User'}</h3>
            <p className="text-xs text-slate-400 font-medium">{user?.email || 'Guest Cleanist'}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full or preferred name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
              value={user?.email || 'N/A (Guest Session)'}
              disabled
            />
          </div>

          {status && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {status.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Save size={15} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserProfile;
