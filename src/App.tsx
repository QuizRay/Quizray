import React, { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { QuizProvider } from './context/QuizContext';
import { useQuiz } from './context/useQuiz';
import { useRoute } from './hooks/useRoute';
import { quizService } from './services/quizService';
import { Header } from './components/layout/Header';
import { HeroSection } from './components/home/HeroSection';
import { CategoriesSection } from './components/home/CategoriesSection';
import { FeaturesSection } from './components/home/FeaturesSection';
import { PopularTestsSection } from './components/home/PopularTestsSection';
import { CallToActionSection } from './components/home/CallToActionSection';
import { Footer } from './components/layout/Footer';
import { CategoryDetailView } from './components/quiz/CategoryDetailView';
import { TestListView } from './components/quiz/TestListView';
import { TestInstructionsView } from './components/quiz/TestInstructionsView';
import { QuizEngineView } from './components/quiz/QuizEngineView';
import { QuizResultView } from './components/quiz/QuizResultView';
import { ProfileView } from './components/profile/ProfileView';
import { TestHistoryView } from './components/history/TestHistoryView';
import { PerformanceView } from './components/performance/PerformanceView';
import { AuthModal } from './components/auth/AuthModal';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminTestManager } from './components/admin/AdminTestManager';
import { AdminQuestionManager } from './components/admin/AdminQuestionManager';
import { AdminCategoryManager } from './components/admin/AdminCategoryManager';

const AppContent: React.FC = () => {
  const {
    route,
    toHome,
    toCategory,
    toTests,
    toInstructions,
    toQuiz,
    toResult,
    toProfile,
    toHistory,
    toHistoricalResult,
    toPerformance,
    toAdmin,
    toAdminTests,
    toAdminQuestions,
    toAdminCategories,
  } = useRoute();
  const { activeTest, startQuiz } = useQuiz();
  const { isAuthModalOpen, authModalMode, closeAuthModal } = useAuth();

  const testIdParam = route.params.testId || 'test-computer-01';

  // Ensure active quiz is loaded into QuizContext if entering or refreshing on the quiz route directly
  useEffect(() => {
    if (route.name === 'quiz') {
      if (!activeTest || (activeTest.id !== testIdParam && activeTest.slug !== testIdParam)) {
        let isCurrent = true;
        quizService
          .getStudentTestById(testIdParam)
          .then((testToStart) => {
            if (!isCurrent) return;
            if (testToStart) {
              startQuiz(testToStart);
            } else {
              toTests();
            }
          })
          .catch(() => {
            if (isCurrent) toTests();
          });

        return () => {
          isCurrent = false;
        };
      }
    }
  }, [route.name, testIdParam, activeTest, startQuiz, toTests]);

  const handleStartQuizFromInstructions = async (testId: string) => {
    try {
      const test = await quizService.getStudentTestById(testId);
      if (test) {
        startQuiz(test);
        toQuiz(test.id);
      } else {
        toTests();
      }
    } catch (err) {
      console.error('Failed to start quiz:', err);
      toTests();
    }
  };

  const handleRetakeTest = async (testId: string) => {
    try {
      const test = await quizService.getStudentTestById(testId);
      if (test) {
        startQuiz(test);
        toQuiz(test.id);
      } else {
        toTests();
      }
    } catch (err) {
      console.error('Failed to retake quiz:', err);
      toTests();
    }
  };

  if (route.name.startsWith('admin')) {
    const adminTab =
      route.name === 'admin-tests'
        ? 'tests'
        : route.name === 'admin-questions'
        ? 'questions'
        : route.name === 'admin-categories'
        ? 'categories'
        : 'dashboard';

    const handleSelectAdminTab = (tab: 'dashboard' | 'tests' | 'questions' | 'categories') => {
      if (tab === 'tests') toAdminTests();
      else if (tab === 'questions') toAdminQuestions();
      else if (tab === 'categories') toAdminCategories();
      else toAdmin();
    };

    return (
      <AdminLayout
        currentTab={adminTab}
        onSelectTab={handleSelectAdminTab}
        onExitAdmin={toHome}
      >
        {route.name === 'admin' && <AdminDashboard onNavigateTab={handleSelectAdminTab} />}
        {route.name === 'admin-tests' && <AdminTestManager />}
        {route.name === 'admin-questions' && <AdminQuestionManager />}
        {route.name === 'admin-categories' && <AdminCategoryManager />}
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-['Inter',sans-serif]">
      {/* For Quiz Engine, display its own distraction-free top bar; for all other views display Main Header */}
      {route.name !== 'quiz' && (
        <Header
          onNavigateHome={toHome}
          onNavigateCategories={() => toCategory('cat-computer')}
          onNavigateTests={toTests}
          onNavigateProfile={toProfile}
          onNavigateHistory={toHistory}
          onNavigatePerformance={toPerformance}
        />
      )}

      <main className="flex-1">
        {route.name === 'home' && (
          <>
            <HeroSection
              onStartTest={toTests}
              onExploreCategories={() => {
                const el = document.querySelector('#categories');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else toCategory('cat-computer');
              }}
            />
            <CategoriesSection onSelectCategory={toCategory} />
            <FeaturesSection />
            <PopularTestsSection onSelectTest={toInstructions} />
            <CallToActionSection />
          </>
        )}

        {route.name === 'category' && (
          <CategoryDetailView
            categoryId={route.params.categoryId || 'cat-computer'}
            onSelectTest={toInstructions}
            onNavigateHome={toHome}
            onSelectCategory={toCategory}
          />
        )}

        {route.name === 'tests' && (
          <TestListView
            onSelectTest={toInstructions}
            onNavigateHome={toHome}
          />
        )}

        {route.name === 'instructions' && (
          <TestInstructionsView
            testId={testIdParam}
            onStartQuiz={handleStartQuizFromInstructions}
            onBack={toTests}
          />
        )}

        {route.name === 'quiz' && (
          <QuizEngineView
            onSubmitted={(submittedTestId) => toResult(submittedTestId)}
            onExit={toTests}
          />
        )}

        {route.name === 'result' && (
          <QuizResultView
            testId={testIdParam}
            submissionId={route.params.submissionId}
            onRetake={handleRetakeTest}
            onExploreTests={toTests}
            onNavigateHome={toHome}
            onNavigateHistory={toHistory}
          />
        )}

        {route.name === 'history' && (
          <TestHistoryView
            onViewResult={(submissionId) => toHistoricalResult(submissionId)}
            onNavigateTests={toTests}
            onNavigateHome={toHome}
          />
        )}

        {route.name === 'profile' && (
          <ProfileView
            onNavigateHome={toHome}
            onNavigateTests={toTests}
            onNavigateHistory={toHistory}
            onNavigatePerformance={toPerformance}
          />
        )}

        {route.name === 'performance' && (
          <PerformanceView
            onNavigateHome={toHome}
            onNavigateTests={toTests}
            onViewResult={(submissionId) => toHistoricalResult(submissionId)}
          />
        )}
      </main>

      {/* Render Footer on all non-quiz pages */}
      {route.name !== 'quiz' && <Footer />}

      {/* Global Auth Modal for Sign In and Sign Up */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <QuizProvider>
        <AppContent />
      </QuizProvider>
    </AuthProvider>
  );
};

export default App;
