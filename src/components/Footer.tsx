import React from 'react';

interface FooterProps {
  onOpenSupport: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport }) => {
  return (
    <footer id="stayplan-footer" className="mt-16 bg-white border-t border-stone-200 py-6 text-stone-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          <p>
            Develop By{' '}
            <a
              href="https://www.syncrozz.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-stone-700 font-medium transition-colors hover:underline"
            >
              Syncrozz
            </a>
          </p>
          <div className="flex items-center gap-4">
            <button
              id="footer-support-cta-btn"
              type="button"
              onClick={onOpenSupport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/90 border border-rose-200/80 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <span>Support ❤️</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

