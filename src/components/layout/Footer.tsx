import React from 'react';
import { Mail, Shield, FileText, HelpCircle, ExternalLink } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { POPULAR_CATEGORIES } from '../../data/mockData';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const handleNav = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0B132B] text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                handleNav('#hero');
              }}
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg"
              aria-label="QuizRay Home"
            >
              <Logo size="md" inverted={true} />
            </a>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-sm">
              QuizRay is a modern online MCQ and examination platform engineered to help learners, students, and competitive aspirants practice smarter, evaluate speed, and master their subjects.
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Platform Status: Operational</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="#/"
                  className="hover:text-white transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#/category/cat-computer"
                  className="hover:text-white transition-colors"
                >
                  Categories
                </a>
              </li>
              <li>
                <a
                  href="#/tests"
                  className="hover:text-white transition-colors"
                >
                  Practice Tests
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav('#features');
                  }}
                  className="hover:text-white transition-colors"
                >
                  About Platform
                </a>
              </li>
              <li>
                <a
                  href="#/admin"
                  className="hover:text-blue-300 text-slate-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                  <span>Admin Portal</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Categories Column */}
          <div className="lg:col-span-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Categories
            </h4>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {POPULAR_CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`#/category/${cat.id}`}
                    className="hover:text-white transition-colors truncate block"
                  >
                    {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Support Column (Strictly real inquiry channels, NO fake addresses or fake phone numbers) */}
          <div className="lg:col-span-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contact & Support
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Have feedback, questions, or test domain requests? Reach our support team.
            </p>
            <div className="space-y-3 text-sm">
              <a
                href="mailto:support@quizray.com"
                className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors group"
              >
                <Mail className="w-4 h-4 text-[#2563EB] group-hover:text-blue-400" />
                <span>support@quizray.com</span>
              </a>

              <div className="flex items-center gap-2.5 text-slate-400 text-xs pt-1">
                <HelpCircle className="w-4 h-4 text-[#F59E0B]" />
                <span>Inquiries processed within 24 hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} QuizRay. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => alert('QuizRay Privacy Policy will be accessible upon full deployment.')}
              className="flex items-center gap-1.5 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => alert('QuizRay Terms & Conditions will be accessible upon full deployment.')}
              className="flex items-center gap-1.5 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms & Conditions</span>
            </button>

            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                handleNav('#hero');
              }}
              className="hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            >
              <span>Back to Top</span>
              <ExternalLink className="w-3 h-3 rotate-45" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
