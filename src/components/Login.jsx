import { useState } from 'react';
import { UserCheck, ShieldCheck, Mail } from 'lucide-react';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

function Login({ onGuestLogin }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in error:', err);
      const code = err?.code || '';
      const message = err?.message || '';
      if (code === 'auth/unauthorized-domain') {
        setErrorMsg(`Domain not authorized in Firebase Console (${window.location.hostname}). Add this domain in Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In is not enabled in Firebase Console. Enable it in Authentication > Sign-in method > Google.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed before completing authentication.');
      } else if (code === 'auth/configuration-not-found' || code === 'auth/invalid-api-key') {
        setErrorMsg(`Firebase config issue (${code}). Please check that the API key and project ID are correctly configured.`);
      } else if (message?.toLowerCase().includes('database is closing') || message?.toLowerCase().includes('indexeddb') || code === 'auth/internal-error') {
        setErrorMsg('Browser storage/IndexedDB connection was reset. Please open the app in a new dedicated tab, refresh the page, or clear site cookies/data.');
      } else {
        setErrorMsg(`Google sign-in failed: ${code ? `${code} - ` : ''}${message || 'Please try again or use Instant Guest mode.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.warn('Firebase anonymous auth fallback to local demo:', err);
      // Fallback seamlessly to local demo guest session
      if (onGuestLogin) {
        onGuestLogin();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F9F7] px-4 py-8 relative overflow-hidden">
      {/* Subtle background ambient blur circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-emerald-100/90 rounded-3xl p-8 shadow-xl shadow-emerald-900/5 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="/Mop_Logo.png"
              alt="Mop Logo"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.src = '/Mop_Icon.png';
              }}
            />
            <h1 className="text-3xl font-extrabold text-teal-950 tracking-tight leading-none">Mop</h1>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Effortless chore tracking for roommates & households</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-2xl text-slate-700 text-sm font-bold shadow-xs transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 font-semibold uppercase tracking-wider">or</span>
            </div>
          </div>

          <button
            onClick={handleGuestSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
          >
            <UserCheck size={18} strokeWidth={2.2} />
            <span>Instant Guest Demo</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600" /> Local Persistence</span>
          <span className="flex items-center gap-1.5"><Mail size={14} className="text-emerald-600" /> Team Invites</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
