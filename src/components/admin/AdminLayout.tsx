import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileQuestion,
  BookOpen,
  FolderTree,
  Database,
  ShieldCheck,
  ArrowLeft,
  Key,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { AdminAuthModal } from './AdminAuthModal';
import { Button } from '../ui/Button';

interface AdminLayoutProps {
  currentTab: 'dashboard' | 'tests' | 'questions' | 'categories';
  onSelectTab: (tab: 'dashboard' | 'tests' | 'questions' | 'categories') => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  onExitAdmin,
  children,
}) => {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('quizray_local_admin');
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const hasSupabase = isSupabaseConfigured();

  // Check Supabase session if configured
  useEffect(() => {
    if (hasSupabase && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user?.email) {
          setCurrentUserEmail(data.session.user.email);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUserEmail(session?.user?.email || null);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [hasSupabase]);

  const handleAuthStateChange = (email: string | null) => {
    setCurrentUserEmail(email);
    if (!hasSupabase) {
      if (email) {
        localStorage.setItem('quizray_local_admin', email);
      } else {
        localStorage.removeItem('quizray_local_admin');
      }
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'tests', label: 'Tests', icon: BookOpen },
    { id: 'questions', label: 'Questions', icon: FileQuestion },
    { id: 'categories', label: 'Categories', icon: FolderTree },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-['Inter',sans-serif] flex flex-col">
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0B132B] border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand + Admin Badge */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onExitAdmin}
                className="flex items-center gap-3 cursor-pointer group"
                title="Return to Student Platform"
              >
                <img
                  src="/quizray-logo.png"
                  alt="QuizRay"
                  className="h-8 w-auto object-contain rounded"
                />
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    QuizRay
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#2563EB]/40 border border-[#2563EB] text-blue-200">
                    Admin Portal
                  </span>
                </div>
              </button>
            </div>

            {/* Center: Tabs */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Admin Sections">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/15 text-white shadow-inner font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right: DB Status + Auth + Exit */}
            <div className="flex items-center gap-3">
              {/* Database Status Pill */}
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  hasSupabase
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                }`}
                title={
                  hasSupabase
                    ? 'Supabase Database is active with RLS policies & RPC validation'
                    : 'Supabase URL/Key not configured in .env. Running local fallback data mode.'
                }
              >
                <Database className="w-3.5 h-3.5" />
                <span>{hasSupabase ? 'Supabase Connected' : 'Local Fallback'}</span>
              </div>

              {/* Admin Auth Pill */}
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentUserEmail
                    ? 'bg-blue-600/30 border border-blue-500/50 text-blue-200 hover:bg-blue-600/40'
                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {currentUserEmail ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="max-w-[120px] truncate">{currentUserEmail}</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Admin Login</span>
                  </>
                )}
              </button>

              {/* Exit to Student Platform Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onExitAdmin}
                className="text-white border-slate-700 hover:bg-white/10 text-xs hidden sm:flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Admin</span>
              </Button>
            </div>
          </div>

          {/* Mobile Tab Strip */}
          <div className="md:hidden flex items-center justify-between pb-3 pt-1 border-t border-slate-800/80 gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Admin Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUserEmail={currentUserEmail}
        onAuthStateChange={handleAuthStateChange}
      />
    </div>
  );
};
