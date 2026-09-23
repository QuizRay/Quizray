import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  Users,
  Database,
  ShieldCheck,
  Lock,
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import type { AdminStats } from '../../types/quiz';

interface AdminDashboardProps {
  onNavigateTab: (tab: 'dashboard' | 'tests' | 'questions' | 'categories') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const hasSupabase = isSupabaseConfigured();

  const loadStats = useCallback(async () => {
    try {
      const data = await quizService.getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system statistics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading) {
    return <LoadingState message="Loading administrative metrics..." />;
  }

  if (error || !stats) {
    return (
      <ErrorState
        error={error || 'Failed to initialize admin dashboard'}
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          void loadStats();
        }}
      />
    );
  }

  const statCards = [
    {
      title: 'Categories',
      value: stats.totalCategories,
      subtitle: 'Active curriculum streams',
      icon: Layers,
      color: 'text-blue-600 bg-blue-50 border-blue-200/80',
      action: () => onNavigateTab('categories'),
    },
    {
      title: 'Practice Tests',
      value: stats.totalTests,
      subtitle: `${stats.publishedTests} published & active`,
      icon: BookOpen,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200/80',
      action: () => onNavigateTab('tests'),
    },
    {
      title: 'Questions Bank',
      value: stats.totalQuestions,
      subtitle: 'Verified MCQs with explanations',
      icon: FileQuestion,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      action: () => onNavigateTab('questions'),
    },
    {
      title: 'Submissions',
      value: stats.totalSubmissions,
      subtitle: 'Verified scorecards logged',
      icon: Users,
      color: 'text-purple-600 bg-purple-50 border-purple-200/80',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                Phase 2 Architecture
              </span>
              <span className="text-xs text-slate-500">Relational Database & Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
              System Overview & Operations
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage curriculum domains, publish assessments, curate question banks, and monitor platform integrity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadStats}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Refresh Metrics</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigateTab('tests')}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>New Assessment</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition-all ${
                card.action ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{card.title}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Database Security & Schema Architecture Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Architecture Checklist */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0B132B] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#2563EB]" />
              <span>Database Architecture & Security Status</span>
            </h2>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                hasSupabase
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {hasSupabase ? 'Supabase Live' : 'Local Fallback'}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-6">
            QuizRay enforces strict zero-trust principles between client browsers and the database layer:
          </p>

          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Answer Key Protection (RPC)</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Student quiz requests fetch question text and options via <code className="bg-slate-200 px-1 rounded">get_test_for_student</code>.
                  The <code className="bg-slate-200 px-1 rounded">correct_option_id</code> and <code className="bg-slate-200 px-1 rounded">explanation</code> are never delivered across the wire during test taking.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Server-Side Scoring Verification</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Clients submit only <code className="bg-slate-200 px-1 rounded">test_id</code>, <code className="bg-slate-200 px-1 rounded">answers</code>, and <code className="bg-slate-200 px-1 rounded">time_taken_seconds</code>.
                  Database function <code className="bg-slate-200 px-1 rounded">submit_quiz_answers</code> computes marks and returns verified scorecard.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Row Level Security (RLS) & Admin Isolation</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Direct mutation of categories, tests, questions, and options requires authorization verified against the <code className="bg-slate-200 px-1 rounded">admin_users</code> table via server-side <code className="bg-slate-200 px-1 rounded">is_admin()</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Navigator */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0B132B] mb-2">Management Controls</h2>
            <p className="text-xs text-slate-600 mb-6">
              Select an administrative area to review, add, or update platform curriculum:
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onNavigateTab('tests')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0B132B] group-hover:text-[#2563EB]">
                      Manage Assessments
                    </p>
                    <p className="text-xs text-slate-500">Create tests, toggle publishing, configure timing</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('questions')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <FileQuestion className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0B132B] group-hover:text-[#2563EB]">
                      Manage Questions
                    </p>
                    <p className="text-xs text-slate-500">Add MCQs, assign answer keys & detailed explanations</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('categories')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0B132B] group-hover:text-[#2563EB]">
                      Manage Categories
                    </p>
                    <p className="text-xs text-slate-500">Curriculum domains, ordering, active status</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Database schema version: 20260905_initial</span>
            <span className="font-semibold text-slate-700">QuizRay Engine 2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
