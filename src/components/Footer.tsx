import React from 'react';

interface FooterProps {
  onOpenSupport: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport }) => {
  return (
    <footer id="stayplan-footer" className="mt-auto bg-white border-t border-slate-200 py-5 text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>
            Develop By{' '}
            <a
              href="https://www.syncrozz.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors hover:underline"
            >
              Syncrozz
            </a>
          </p>
          <div className="flex items-center gap-3">
            <button
              id="footer-support-cta-btn"
              type="button"
              onClick={onOpenSupport}
              className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Bantuan & Sokongan
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

