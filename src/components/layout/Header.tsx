import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, User, LogOut, ChevronDown, Clock, BarChart3 } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/useAuth';

interface HeaderProps {
  onNavigateHome?: () => void;
  onNavigateCategories?: () => void;
  onNavigateTests?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHistory?: () => void;
  onNavigatePerformance?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  onNavigateCategories,
  onNavigateTests,
  onNavigateProfile,
  onNavigateHistory,
  onNavigatePerformance,
}) => {
  const { user, profile, isAuthenticated, openAuthModal, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setUserDropdownOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleHomeClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (onNavigateHome) onNavigateHome();
    else window.location.hash = '#/';
  };

  const handleCategoriesClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    const catEl = document.querySelector('#categories');
    if (catEl) {
      catEl.scrollIntoView({ behavior: 'smooth' });
    } else if (onNavigateCategories) {
      onNavigateCategories();
    } else {
      window.location.hash = '#/category/cat-computer';
    }
  };

  const handleTestsClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (onNavigateTests) onNavigateTests();
    else window.location.hash = '#/tests';
  };

  const handleProfileClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (onNavigateProfile) onNavigateProfile();
    else window.location.hash = '#/profile';
  };

  const handleHistoryClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (onNavigateHistory) onNavigateHistory();
    else window.location.hash = '#/history';
  };

  const handlePerformanceClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (onNavigatePerformance) onNavigatePerformance();
    else window.location.hash = '#/performance';
  };

  const handleAboutClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    const aboutEl = document.querySelector('#features');
    if (aboutEl) {
      aboutEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = '#/';
      setTimeout(() => {
        const el = document.querySelector('#features');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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

  const displayName = profile?.fullName || (user?.email ? user.email.split('@')[0] : 'Student');

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80'
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo on Left */}
          <a
            href="#/"
            onClick={handleHomeClick}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg cursor-pointer"
            aria-label="QuizRay Home"
          >
            <Logo size="md" />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            <button
              type="button"
              onClick={handleHomeClick}
              className="text-sm font-semibold text-slate-600 hover:text-[#2563EB] transition-colors py-1 cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={handleCategoriesClick}
              className="text-sm font-semibold text-slate-600 hover:text-[#2563EB] transition-colors py-1 cursor-pointer"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={handleTestsClick}
              className="text-sm font-semibold text-slate-600 hover:text-[#2563EB] transition-colors py-1 cursor-pointer"
            >
              Tests
            </button>
            <button
              type="button"
              onClick={handleAboutClick}
              className="text-sm font-semibold text-slate-600 hover:text-[#2563EB] transition-colors py-1 cursor-pointer"
            >
              About
            </button>
          </nav>

          {/* Desktop Auth-Aware Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2563EB] to-blue-400 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {getInitials(profile?.fullName, user.email)}
                  </div>
                  <span className="text-sm font-semibold text-slate-800 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleProfileClick}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>My Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleHistoryClick}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>Test History</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePerformanceClick}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <BarChart3 className="w-4 h-4 text-slate-400" />
                        <span>Performance</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setUserDropdownOpen(false);
                          await logout();
                          if (onNavigateHome) onNavigateHome();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAuthModal('login')}
                >
                  Log in
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openAuthModal('signup')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-18 z-40 bg-slate-900/20 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="bg-white border-b border-slate-200 px-5 pt-4 pb-6 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Authenticated user badge in mobile menu */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2563EB] to-blue-400 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {getInitials(profile?.fullName, user.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-1">
              <button
                type="button"
                onClick={handleHomeClick}
                className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] text-left transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                onClick={handleCategoriesClick}
                className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] text-left transition-colors"
              >
                Categories
              </button>
              <button
                type="button"
                onClick={handleTestsClick}
                className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] text-left transition-colors"
              >
                Practice Tests
              </button>
              {isAuthenticated && (
                <>
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] text-left transition-colors"
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleHistoryClick}
                    className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] text-left transition-colors"
                  >
                    Test History
                  </button>
                  <button
                    type="button"
                    onClick={handlePerformanceClick}
                    className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] text-left transition-colors"
                  >
                    Performance
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleAboutClick}
                className="px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-[#2563EB] text-left transition-colors"
              >
                About
              </button>
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    if (onNavigateHome) onNavigateHome();
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  <span>Sign Out</span>
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    fullWidth
                    size="md"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                  >
                    Log in
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    size="md"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('signup');
                    }}
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
