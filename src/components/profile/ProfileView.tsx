import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Award, Check, Edit2, LogOut, ArrowRight, ShieldCheck, Loader2, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { authService } from '../../services/authService';
import { Button } from '../ui/Button';

interface ProfileViewProps {
  onNavigateHome: () => void;
  onNavigateTests: () => void;
  onNavigateHistory?: () => void;
  onNavigatePerformance?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavigateHome,
  onNavigateTests,
  onNavigateHistory,
  onNavigatePerformance,
}) => {
  const { user, profile, isLoading, isAuthenticated, updateProfile, logout, openAuthModal } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [completedQuizCount, setCompletedQuizCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true);

  // Sync profile name to input
  useEffect(() => {
    if (profile) {
      setFullNameInput(profile.fullName || '');
    }
  }, [profile]);

  // Load user's submission count
  useEffect(() => {
    let isMounted = true;
    if (user) {
      authService.getUserCompletedQuizCount(user.id).then((count) => {
        if (isMounted) {
          setCompletedQuizCount(count);
          setIsLoadingCount(false);
        }
      });
    } else {
      setIsLoadingCount(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-36 bg-slate-200 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-28 bg-slate-200 rounded-2xl" />
            <div className="h-28 bg-slate-200 rounded-2xl" />
            <div className="h-28 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, show protected route access prompt
  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Sign In to View Your Profile</h2>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Please log in to your QuizRay student account to view personal stats and account settings.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => openAuthModal('login')}
            >
              Sign In to Account
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onNavigateHome}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!fullNameInput.trim()) {
      setSaveError('Full Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({ fullName: fullNameInput });
      if (res.error) {
        setSaveError(res.error.message || 'Failed to update profile.');
      } else {
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'QR';
  };

  const formattedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      {/* Header Profile Hero Card */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-white p-6 sm:p-8 rounded-3xl shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar / Initials badge */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-blue-400 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0">
            {getInitials(profile?.fullName, user.email)}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">
                {profile?.fullName || (user.email ? user.email.split('@')[0] : 'QuizRay Student')}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Student</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-4 h-4 opacity-70" />
              <span>{user.email}</span>
            </p>
            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
              <Calendar className="w-3.5 h-3.5 opacity-60" />
              <span>Member since {formattedDate}</span>
            </p>
          </div>

          <div className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                onNavigateHome();
              }}
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/40"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {isLoadingCount ? '...' : completedQuizCount}
              </div>
              <div className="text-xs font-medium text-slate-500">Quizzes Completed</div>
            </div>
          </div>
          {onNavigateHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateHistory}
              className="text-xs font-semibold shrink-0"
            >
              <span>History</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">Active</div>
            <div className="text-xs font-medium text-slate-500">Account Status</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{formattedDate}</div>
            <div className="text-xs font-medium text-slate-500">Registration Date</div>
          </div>
        </div>
      </div>

      {/* Performance & Analytics Banner */}
      {onNavigatePerformance && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold">Performance & Analytics</h4>
              <p className="text-xs sm:text-sm text-slate-300">
                Track your score progression, subject accuracy, pacing efficiency, and focus areas.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={onNavigatePerformance}
            className="shrink-0 relative z-10 bg-[#2563EB] hover:bg-blue-600 text-white shadow-sm"
          >
            <span>View Detailed Analytics</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Account Settings Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Account Details</h3>
            <p className="text-xs text-slate-500">Manage your student credentials and personal profile information</p>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                setSaveSuccess(false);
                setSaveError(null);
              }}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Edit Details</span>
            </Button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Your profile details have been saved successfully.</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {saveError}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Email Address (Read-only)</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400">Email is tied to your Supabase Auth account.</p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setFullNameInput(profile?.fullName || '');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Full Name</span>
                <p className="text-sm font-semibold text-slate-900">
                  {profile?.fullName || 'Not specified'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Email Address</span>
                <p className="text-sm font-semibold text-slate-900">{user.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Student ID</span>
                <p className="text-xs font-mono text-slate-600 truncate">{user.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Security Provider</span>
                <p className="text-sm font-semibold text-slate-900">Supabase Auth (PostgreSQL RLS)</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Practice Test Exploration Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-lg font-bold text-slate-900">Ready to test your knowledge?</h4>
          <p className="text-xs sm:text-sm text-slate-600">
            Explore hundreds of verified questions across Computer, Science, Reasoning, and more.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={onNavigateTests}
          className="shrink-0"
        >
          <span>Explore Tests</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
};
