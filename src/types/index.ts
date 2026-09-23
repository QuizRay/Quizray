export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: 'computer' | 'math' | 'science' | 'gk' | 'reasoning' | 'english' | 'banking' | 'gov';
  testCount: number;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface TestItem {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  questionCount: number;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  totalAttempts: number;
  rating: number;
  isPopular: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  iconName: 'timer' | 'results' | 'tracking' | 'recommendations';
  tagline?: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export * from './quiz';
export * from './auth';
