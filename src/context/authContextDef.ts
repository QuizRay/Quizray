import { createContext } from 'react';
import type { UserProfile, AuthError } from '../types/auth';
import type { SignUpResult, SignInResult } from '../services/authService';

export interface AuthContextValue {
  user: { id: string; email?: string } | null;
  profile: UserProfile | null;
  session: unknown | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<SignInResult>;
  signup: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  updateProfile: (updates: { fullName?: string; avatarUrl?: string }) => Promise<{ error?: AuthError }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
