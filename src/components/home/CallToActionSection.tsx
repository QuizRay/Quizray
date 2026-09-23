import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export const CallToActionSection: React.FC = () => {
  const handleScrollToTests = () => {
    const el = document.querySelector('#tests');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#0B132B] px-6 py-12 sm:px-12 sm:py-16 md:py-20 text-center shadow-xl border border-slate-800">
          {/* Subtle geometric golden ray and electric blue accent glow */}
          <div className="absolute -right-24 -top-24 w-80 h-80 bg-[#2563EB]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-[#F59E0B]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Diagonal subtle ray line */}
          <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-[#F59E0B]/30 to-transparent rotate-12 pointer-events-none" />

          <div className="relative max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-blue-200 text-xs font-semibold mb-6 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Free & Immediate Access</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              Ready to challenge yourself?
            </h2>

            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto">
              Join thousands of aspiring students and professionals building consistent test habits and measuring real progress every day.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="gold"
                size="lg"
                onClick={handleScrollToTests}
                className="w-full sm:w-auto shadow-lg shadow-amber-500/10"
              >
                <span>Start Your First Test</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
