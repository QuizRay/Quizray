import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
  onAuthStateChange: (email: string | null) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onAuthStateChange,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasSupabase = isSupabaseConfigured();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasSupabase) {
      // Local fallback mode: simulate admin sign-in for development/demonstration
      if (!email.trim()) {
        setError('Please enter an email address.');
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onAuthStateChange(email.trim());
        setSuccess('Logged in as administrator in Local Mode.');
        setTimeout(() => {
          onClose();
        }, 800);
      }, 500);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const client = supabase!;
      const { data, error: authError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        throw new Error(authError.message);
      }

      onAuthStateChange(data.user?.email || email.trim());
      setSuccess('Successfully authenticated with Supabase!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      if (hasSupabase && supabase) {
        await supabase.auth.signOut();
      }
      onAuthStateChange(null);
      setSuccess('Signed out successfully.');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentUserEmail ? 'Administrator Account' : 'Admin Portal Authentication'}
    >
      <div className="space-y-4">
        {currentUserEmail ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Active Session
                </p>
                <p className="text-sm font-bold text-emerald-950">{currentUserEmail}</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {hasSupabase
                    ? 'Connected with Supabase Auth. Subject to RLS server-side policies.'
                    : 'Running in local verified dataset mode.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSignOut}
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                <span>{isLoading ? 'Signing Out...' : 'Sign Out'}</span>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {hasSupabase
                ? 'Sign in with your administrator credentials to manage categories, tests, and question banks via Supabase.'
                : 'Supabase credentials are not configured in .env yet. Enter an admin email to access the local admin management interface.'}
            </p>

            {!hasSupabase && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Local Dev Fallback: </span>
                  Enter any administrator email (e.g. <code className="bg-amber-100 px-1 rounded">admin@quizray.io</code>) to manage the local curriculum dataset.
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@quizray.io"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
            </div>

            {hasSupabase && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                <span>{isLoading ? 'Signing In...' : 'Sign In as Admin'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
