import React from 'react';
import type { Question, StudentQuestion, OptionId, QuestionStatus } from '../../types/quiz';

interface QuestionPaletteProps {
  questions: (Question | StudentQuestion)[];
  currentQuestionIndex: number;
  answers: Record<string, OptionId>;
  markedQuestions: Set<string>;
  getQuestionStatus: (questionId: string, index: number) => QuestionStatus;
  onSelectQuestion: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentQuestionIndex,
  answers,
  markedQuestions,
  getQuestionStatus,
  onSelectQuestion,
}) => {
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedQuestions.size;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
      <h3 className="text-sm font-bold text-[#0B132B] uppercase tracking-wider mb-3">
        Question Palette
      </h3>

      {/* Summary Badges */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="p-2 bg-emerald-50 border border-emerald-200/80 rounded-xl">
          <p className="text-xs font-semibold text-emerald-800">Answered</p>
          <p className="text-base font-extrabold text-emerald-700">{answeredCount}</p>
        </div>

        <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-700">Pending</p>
          <p className="text-base font-extrabold text-slate-800">{unansweredCount}</p>
        </div>

        <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-xl">
          <p className="text-xs font-semibold text-amber-800">Marked</p>
          <p className="text-base font-extrabold text-amber-700">{markedCount}</p>
        </div>
      </div>

      {/* Question Number Matrix */}
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const status = getQuestionStatus(q.id, idx);
          const isCurrent = idx === currentQuestionIndex;

          let statusClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';

          if (status === 'marked-answered') {
            statusClass = 'bg-amber-500 text-white hover:bg-amber-600 border border-amber-600';
          } else if (status === 'marked') {
            statusClass = 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 font-bold';
          } else if (status === 'answered') {
            statusClass = 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700';
          }

          const activeRing = isCurrent ? 'ring-2 ring-offset-2 ring-[#2563EB] font-black scale-105' : '';

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`h-9 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center cursor-pointer ${statusClass} ${activeRing}`}
              aria-label={`Question ${idx + 1}, status: ${status}`}
            >
              <span>{idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-600" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-slate-200" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-amber-500" />
          <span>Marked for Review</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm border-2 border-[#2563EB] bg-white" />
          <span>Current Active</span>
        </div>
      </div>
    </div>
  );
};
