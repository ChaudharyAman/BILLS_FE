import React, { useState } from 'react';
import { FaInbox, FaShieldAlt, FaSpinner, FaExclamationCircle, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { storeAuthSession } from '../api/axios';
import GoogleSignInButton from '../components/GoogleSignInButton';

/**
 * SubmissionsInboxLogin
 *
 * Dedicated, distraction-free login view specifically for the Submissions Inbox.
 * Provides a single "Sign in with Google" authentication flow.
 */
export default function SubmissionsInboxLogin({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleSuccess = async (credential) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await api.post('/auth/google', { credential });
      storeAuthSession(response.data);
      window.dispatchEvent(new Event('auth-sync'));
      toast.success('Signed in successfully!');

      if (onLoginSuccess) {
        onLoginSuccess(response.data);
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      const msg = err.response?.data?.message || 'Authentication failed. Please check your credentials or try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    setErrorMessage(typeof err === 'string' ? err : 'Google Sign-In was cancelled or failed.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 font-sans selection:bg-blue-100">
      {/* Decorative ambient background elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/50 p-8 sm:p-10 transition-all">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          {/* Glowing Icon Badge */}
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <FaInbox size={28} className="transform -rotate-6" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] shadow-sm">
              <FaLock size={10} />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-3">
            <span>Flance Workspace</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Submissions Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs">
            Review invoices, bills, and documents submitted to your company portal.
          </p>
        </div>

        {/* Divider */}
        <div className="my-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Authorized Reviewers
          </span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 leading-snug animate-shake">
            <FaExclamationCircle size={15} className="flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Area: Sign in with Google only */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <FaSpinner className="animate-spin text-blue-600" size={28} />
              <p className="text-xs text-slate-500 font-medium">
                Authenticating with Google...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={loading}
                text="signin_with"
                theme="outline"
                size="large"
                shape="rectangular"
                width={320}
              />
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-4 leading-relaxed">
            By signing in, you access company submission records under your Google account permissions.
          </p>
        </div>

        {/* Footer info badge */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <FaShieldAlt size={12} className="text-emerald-500" />
          <span>Protected by Google Identity & TLS Encryption</span>
        </div>
      </div>

      {/* Subtle bottom copyright */}
      <p className="mt-6 text-xs text-slate-400 font-medium select-none">
        © 2026 Flance. All rights reserved.
      </p>
    </div>
  );
}
