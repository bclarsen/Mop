import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase';

function ProfileSetup({ user, onComplete }) {
  const [name, setName] = useState(user.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (user.updateProfile) {
        await updateProfile(user, { displayName: trimmed });
      }

      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: trimmed,
          email: user.email || '',
          photoURL: user.photoURL || '',
          profileComplete: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      onComplete(trimmed);
    } catch (err) {
      console.error('Error saving profile setup:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F9F7] px-4 py-8">
      <div className="w-full max-w-md bg-white border border-emerald-100/90 rounded-3xl p-8 shadow-xl shadow-emerald-900/5">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-4">
            <Sparkles size={26} />
          </div>
          <h2 className="text-2xl font-extrabold text-teal-950 tracking-tight">Welcome to Mop!</h2>
          <p className="text-sm text-slate-500 mt-1">What should your roommates or household call you?</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-teal-950 uppercase tracking-wider">Your Display Name</label>
            <input
              type="text"
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              placeholder="e.g. Alex, Jordan, Sam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] mt-2"
          >
            <span>{loading ? 'Saving...' : 'Get Started'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileSetup;
