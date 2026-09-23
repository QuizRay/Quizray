import React, { useState } from 'react';
import { ArrowRight, Clock, Sparkles, CheckCircle2, Award, Zap, Compass } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface HeroSectionProps {
  onStartTest?: () => void;
  onExploreCategories?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartTest,
  onExploreCategories,
}) => {
  const [selectedOption, setSelectedOption] = useState<number>(1); // Option B default selected

  const mockOptions = [
    { label: 'A', text: 'Stack (LIFO)', isCorrect: false },
    { label: 'B', text: 'Queue (FIFO)', isCorrect: true },
    { label: 'C', text: 'Binary Search Tree', isCorrect: false },
    { label: 'D', text: 'Priority Heap', isCorrect: false },
  ];

  const scrollToSection = (selector: string) => {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative pt-8 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-32 overflow-hidden"
    >
      {/* Subtle modern background ambient gradients (clean & non-childish) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-blue-50/70 rounded-full blur-3xl -z-10" />
        <div className="absolute top-1/2 left-0 w-[450px] h-[450px] bg-amber-50/50 rounded-full blur-3xl -z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 text-center lg:text-left">
            {/* Top Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs sm:text-sm font-semibold mb-6 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-[#2563EB]" />
              <span>Next-Gen Practice & Assessment</span>
              <span className="text-blue-400">|</span>
              <span className="inline-flex items-center text-amber-700 font-medium text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#F59E0B]" />
                Timed & Verified
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif] leading-[1.12]">
              Test Your Knowledge.{' '}
              <span className="relative inline-block text-[#2563EB]">
                Improve Every Day.
                <span className="absolute -bottom-1 left-0 w-full h-[4px] bg-[#F59E0B] rounded-full opacity-80" />
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Practice smarter with interactive quizzes, instant results and personalized progress.
            </p>

            {/* CTA Group */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 sm:gap-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto shadow-md shadow-blue-500/15"
                onClick={() => {
                  if (onStartTest) onStartTest();
                  else scrollToSection('#tests');
                }}
              >
                <span>Start a Test</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (onExploreCategories) onExploreCategories();
                  else scrollToSection('#categories');
                }}
              >
                <Compass className="w-4 h-4 text-slate-600" />
                <span>Explore Categories</span>
              </Button>
            </div>

            {/* Quick trust metrics */}
            <div className="mt-10 pt-8 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#0B132B]">500+</p>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Curated Tests</p>
              </div>
              <div className="border-x border-slate-200/80 px-2 sm:px-4">
                <p className="text-2xl sm:text-3xl font-bold text-[#2563EB]">8</p>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Core Domains</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#0B132B]">Instant</p>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Analytics</p>
              </div>
            </div>
          </div>

          {/* Right Column: Subtle Modern Quiz Showcase Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Ambient backdrop glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/60 to-amber-100/40 rounded-3xl blur-xl -z-10 transform scale-95" />

            {/* Main Interactive Preview Card */}
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-5 sm:p-6 transition-all duration-300 hover:border-blue-300">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Live Question 04/25
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="difficulty" difficulty="Intermediate" size="sm">
                    Intermediate
                  </Badge>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-md border border-amber-200/70">
                    <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>00:45</span>
                  </div>
                </div>
              </div>

              {/* Question Body */}
              <div className="mt-4">
                <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1">
                  Computer Science • Data Structures
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[#0B132B] leading-snug">
                  Which data structure strictly operates on the First-In, First-Out (FIFO) principle?
                </h2>
              </div>

              {/* Options List */}
              <div className="mt-5 space-y-2.5">
                {mockOptions.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-sm font-medium transition-all duration-150 ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/80 text-[#0B132B] shadow-2xs ring-1 ring-[#2563EB]/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                            isSelected
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="text-sm">{opt.text}</span>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Card Footer Metric */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>
                    <strong className="text-slate-800 font-semibold">94%</strong> accuracy rate
                  </span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-[#2563EB]">
                  <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>+25 Points</span>
                </div>
              </div>
            </div>

            {/* Subtle Floating Highlight Badge */}
            <div className="hidden sm:flex absolute -bottom-5 -left-4 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-lg items-center gap-2.5 text-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563EB]">
                <Zap className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div>
                <p className="font-bold text-[#0B132B]">Real-Time Speed</p>
                <p className="text-[11px] text-slate-500">Instant answer evaluations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
