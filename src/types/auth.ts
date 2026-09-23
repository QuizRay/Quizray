export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthState {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: UserProfile | null;
  session: unknown | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
