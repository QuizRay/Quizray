import { useContext } from 'react';
import { QuizContext, type QuizContextValue } from './QuizContext';

export const useQuiz = (): QuizContextValue => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};
