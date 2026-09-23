import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile, AuthError } from '../types/auth';

const LOCAL_USER_KEY = 'quizray_local_auth_user';
const LOCAL_PROFILE_KEY = 'quizray_local_auth_profile';

export interface SignUpResult {
  user: { id: string; email?: string } | null;
  session: unknown | null;
  requiresEmailConfirmation: boolean;
  error?: AuthError;
}

export interface SignInResult {
  user: { id: string; email?: string } | null;
  session: unknown | null;
  error?: AuthError;
}

export const authService = {
  /**
   * Check if Supabase client is configured
   */
  isConfigured(): boolean {
    return isSupabaseConfigured() && supabase !== null;
  },

  /**
   * Listen to auth state transitions
   */
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    if (!this.isConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase!.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  /**
   * Get initial session on app launch
   */
  async getSession() {
    if (!this.isConfigured()) {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      if (stored) {
        try {
          const user = JSON.parse(stored);
          return { data: { session: { user } }, error: null };
        } catch {
          return { data: { session: null }, error: null };
        }
      }
      return { data: { session: null }, error: null };
    }

    return await supabase!.auth.getSession();
  },

  /**
   * Register a new user
   */
  async signUp(email: string, password: string, fullName: string): Promise<SignUpResult> {
    if (!this.isConfigured()) {
      // Local fallback mode: check registry to prevent duplicate accounts
      const storedRegistryRaw = localStorage.getItem('quizray_local_users_registry');
      const registeredUsers: Array<{ id: string; email: string; fullName: string }> = storedRegistryRaw
        ? JSON.parse(storedRegistryRaw)
        : [];

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = registeredUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (existingUser) {
        return {
          user: null,
          session: null,
          requiresEmailConfirmation: false,
          error: {
            message: 'An account with this email already exists. Please log in instead.',
            code: 'user_already_exists',
          },
        };
      }

      const mockId = 'local-user-' + Date.now();
      const mockUser = { id: mockId, email: normalizedEmail };
      const mockProfile: UserProfile = {
        id: mockId,
        email: normalizedEmail,
        fullName: fullName.trim() || normalizedEmail.split('@')[0],
        createdAt: new Date().toISOString(),
      };

      registeredUsers.push({ id: mockId, email: normalizedEmail, fullName: mockProfile.fullName });
      localStorage.setItem('quizray_local_users_registry', JSON.stringify(registeredUsers));
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(mockProfile));

      return {
        user: mockUser,
        session: { user: mockUser },
        requiresEmailConfirmation: false,
      };
    }

    try {
      const { data, error } = await supabase!.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || email.split('@')[0],
          },
        },
      });

      if (error) {
        const isDuplicate =
          error.code === 'user_already_exists' ||
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists');

        return {
          user: null,
          session: null,
          requiresEmailConfirmation: false,
          error: {
            message: isDuplicate
              ? 'An account with this email already exists. Please log in instead.'
              : error.message,
            code: isDuplicate ? 'user_already_exists' : error.code,
          },
        };
      }

      const user = data.user;
      const session = data.session;

      // CRITICAL SECURITY FIX: Detect existing user via identities array
      // When email confirmations or anti-enumeration is enabled in Supabase,
      // Supabase does not create a duplicate user; it returns data.user with identities: [] and session: null.
      // We must detect this empty identities array and reject duplicate signup with a clear user message.
      if (user && Array.isArray(user.identities) && user.identities.length === 0) {
        return {
          user: null,
          session: null,
          requiresEmailConfirmation: false,
          error: {
            message: 'An account with this email already exists. Please log in instead.',
            code: 'user_already_exists',
          },
        };
      }

      // If user is returned with valid identities but session is null, email confirmation is required by Supabase
      const requiresEmailConfirmation = Boolean(user && !session);

      return {
        user: user ? { id: user.id, email: user.email } : null,
        session,
        requiresEmailConfirmation,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        requiresEmailConfirmation: false,
        error: { message: err instanceof Error ? err.message : 'Signup failed. Please try again.' },
      };
    }
  },

  /**
   * Log in an existing user
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    if (!this.isConfigured()) {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        return { user, session: { user } };
      }
      const mockId = 'local-user-' + Date.now();
      const mockUser = { id: mockId, email };
      return { user: mockUser, session: { user: mockUser } };
    }

    try {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: { message: error.message, code: error.code },
        };
      }

      return {
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
        session: data.session,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: { message: err instanceof Error ? err.message : 'Sign in failed. Please try again.' },
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error?: AuthError }> {
    if (!this.isConfigured()) {
      localStorage.removeItem(LOCAL_USER_KEY);
      localStorage.removeItem(LOCAL_PROFILE_KEY);
      return {};
    }

    try {
      const { error } = await supabase!.auth.signOut();
      if (error) {
        return { error: { message: error.message } };
      }
      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Logout failed.' } };
    }
  },

  /**
   * Retrieve user profile from profiles table
   */
  async getProfile(userId: string, userEmail?: string): Promise<UserProfile | null> {
    if (!this.isConfigured()) {
      const stored = localStorage.getItem(LOCAL_PROFILE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Ignore
        }
      }
      return {
        id: userId,
        email: userEmail || 'student@quizray.com',
        fullName: userEmail ? userEmail.split('@')[0] : 'QuizRay Student',
        createdAt: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch note:', error.message);
        return null;
      }

      if (!data) {
        // Fallback: If trigger hasn't fired yet or wasn't set, create initial profile safely
        const fallbackName = userEmail ? userEmail.split('@')[0] : 'Student';
        const { data: created, error: insertError } = await supabase!
          .from('profiles')
          .insert({
            id: userId,
            full_name: fallbackName,
          })
          .select()
          .single();

        if (insertError) {
          console.warn('Could not auto-insert profile:', insertError.message);
          return {
            id: userId,
            email: userEmail || '',
            fullName: fallbackName,
            createdAt: new Date().toISOString(),
          };
        }

        return {
          id: created.id,
          email: userEmail || '',
          fullName: created.full_name || fallbackName,
          avatarUrl: created.avatar_url,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        };
      }

      return {
        id: data.id,
        email: userEmail || '',
        fullName: data.full_name || (userEmail ? userEmail.split('@')[0] : 'Student'),
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('Error in getProfile:', err);
      return null;
    }
  },

  /**
   * Update profile fields in profiles table
   */
  async updateProfile(userId: string, updates: { fullName?: string; avatarUrl?: string }): Promise<{ error?: AuthError }> {
    if (!this.isConfigured()) {
      const stored = localStorage.getItem(LOCAL_PROFILE_KEY);
      const current: UserProfile = stored ? JSON.parse(stored) : { id: userId, email: '', fullName: '', createdAt: '' };
      const updated: UserProfile = {
        ...current,
        fullName: updates.fullName !== undefined ? updates.fullName : current.fullName,
        avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : current.avatarUrl,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      return {};
    }

    try {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.fullName !== undefined) updatePayload.full_name = updates.fullName.trim();
      if (updates.avatarUrl !== undefined) updatePayload.avatar_url = updates.avatarUrl;

      const { error } = await supabase!
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (error) {
        return { error: { message: error.message } };
      }

      // Also sync user metadata
      if (updates.fullName) {
        await supabase!.auth.updateUser({
          data: { full_name: updates.fullName.trim() },
        });
      }

      return {};
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : 'Failed to update profile.' } };
    }
  },

  /**
   * Get user's completed test count via secure server-side RPC (Zero Direct SELECT)
   * Identity is derived strictly from auth.uid() on the database server.
   */
  async getUserCompletedQuizCount(_userId?: string): Promise<number> {
    if (!this.isConfigured()) {
      try {
        const raw = localStorage.getItem('quizray_local_quiz_history');
        return raw ? (JSON.parse(raw) as unknown[]).length : 0;
      } catch {
        return 0;
      }
    }

    try {
      const { data, error } = await supabase!.rpc('get_user_completed_quiz_count');
      if (error) {
        return 0;
      }

      return typeof data === 'number' ? data : 0;
    } catch {
      return 0;
    }
  },
};
