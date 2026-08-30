import React, { useEffect } from 'react';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, RefreshCw, AlertCircle, WifiOff, X } from 'lucide-react';

export const SaveSyncFloatingBar: React.FC = () => {
  const {
    isSyncing,
    syncStatus,
    syncError,
    saveFeedback,
    refreshFromCloud,
    clearSaveFeedback
  } = useStay();
  const { isUnlocked } = useAuth();

  // Auto clear feedback after 5 seconds
  useEffect(() => {
    if (saveFeedback) {
      const timer = setTimeout(() => {
        clearSaveFeedback();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveFeedback, clearSaveFeedback]);

  // If there's an active save feedback toast
  if (saveFeedback) {
    return (
      <div
        id="save-sync-toast-feedback"
        className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-700 shadow-emerald-950/20'
              : 'bg-rose-900 text-rose-50 border-rose-700 shadow-rose-950/20'
          }`}
        >
          {saveFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-bold text-xs uppercase tracking-wider text-emerald-200">
              {saveFeedback.type === 'success' ? 'Sync' : 'Sync Failed'}
            </p>
            <p className="text-xs text-stone-100">{saveFeedback.message}</p>
          </div>
          <button
            onClick={clearSaveFeedback}
            className="p-1 text-stone-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Active sync/saving floating pill (small, unobtrusive and accurate)
  if (isUnlocked && (isSyncing || syncStatus === 'SAVING' || syncStatus === 'SYNCING')) {
    return (
      <div
        id="saving-sync-floating-pill"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <div className="bg-stone-900/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg border border-stone-700 flex items-center gap-2.5 text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Syncing...</span>
        </div>
      </div>
    );
  }

  // Persistent Error indicator with Retry
  if (isUnlocked && syncStatus === 'ERROR' && syncError) {
    return (
      <div
        id="sync-error-floating-bar"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="bg-rose-950/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="truncate">
              <p className="text-xs font-bold text-rose-100">Sync Failed</p>
              <p className="text-[11px] text-rose-200 truncate">{syncError}</p>
            </div>
          </div>
          <button
            onClick={() => refreshFromCloud()}
            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            Cuba Semula
          </button>
        </div>
      </div>
    );
  }

  // Offline indicator
  if (syncStatus === 'OFFLINE') {
    return (
      <div
        id="offline-floating-pill"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <div className="bg-stone-800/90 backdrop-blur-md text-stone-200 px-4 py-2 rounded-full shadow-lg border border-stone-700 flex items-center gap-2 text-xs font-medium">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Offline</span>
        </div>
      </div>
    );
  }

  return null;
};
