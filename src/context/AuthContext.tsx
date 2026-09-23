import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './authContextDef';
import { authService, type SignUpResult, type SignInResult } from '../services/authService';
import type { UserProfile } from '../types/auth';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const openAuthModal = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const p = await authService.getProfile(userId, email);
      setProfile(p);
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }, []);

  // Initialize session and set up reactive listener
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data } = await authService.getSession();
        if (!isMounted) return;

        const currentSession = data?.session as { user?: { id: string; email?: string } } | null;
        if (currentSession?.user) {
          setUser({ id: currentSession.user.id, email: currentSession.user.email });
          setSession(currentSession);
          await loadProfile(currentSession.user.id, currentSession.user.email);
        } else {
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } catch (err) {
        console.warn('Init auth failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = authService.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      const typedSession = newSession as { user?: { id: string; email?: string } } | null;
      if (typedSession?.user) {
        setUser({ id: typedSession.user.id, email: typedSession.user.email });
        setSession(typedSession);
        await loadProfile(typedSession.user.id, typedSession.user.email);
      } else {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const login = async (email: string, password: string): Promise<SignInResult> => {
    const result = await authService.signIn(email, password);
    if (!result.error && result.user) {
      setUser(result.user);
      setSession(result.session);
      await loadProfile(result.user.id, result.user.email);
      closeAuthModal();
    }
    return result;
  };

  const signup = async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
    const result = await authService.signUp(email, password, fullName);
    if (!result.error && result.user) {
      if (result.session) {
        setUser(result.user);
        setSession(result.session);
        await loadProfile(result.user.id, result.user.email);
        closeAuthModal();
      }
      // If email confirmation is required, do not close modal yet so user can read message
    }
    return result;
  };

  const logout = async (): Promise<void> => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const updateProfile = async (updates: { fullName?: string; avatarUrl?: string }) => {
    if (!user) return { error: { message: 'Not authenticated' } };
    const res = await authService.updateProfile(user.id, updates);
    if (!res.error) {
      await loadProfile(user.id, user.email);
    }
    return res;
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id, user.email);
    }
  };

  const value: AuthContextValue = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: Boolean(user),
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    signup,
    logout,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
