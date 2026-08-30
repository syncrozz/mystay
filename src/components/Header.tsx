import React, { useState, useRef, useEffect } from 'react';
import { ASSETS, STAY_TYPES } from '../utils/constants';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Share2,
  FolderKanban,
  ChevronDown,
  Lock,
  LogOut,
  Shield,
  Cloud,
  RefreshCw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  onOpenNewStay: () => void;
  onOpenStayList: () => void;
  onOpenShare: () => void;
  onOpenSupport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewStay,
  onOpenStayList,
  onOpenShare
}) => {
  const {
    activeStay,
    isSyncing,
    syncStatus,
    refreshFromCloud
  } = useStay();
  const { user, userProfile, role, lockApp, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const stayTypeMeta = activeStay ? STAY_TYPES[activeStay.type] || STAY_TYPES.custom : null;

  const handleManualRefresh = async () => {
    const res = await refreshFromCloud({ forceFetch: true });
    setSyncFeedback(res.message);
    setTimeout(() => {
      setSyncFeedback(null);
    }, 4000);
  };

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header id="stayplan-main-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group cursor-pointer" onClick={onOpenStayList} title="Pilih atau Tukar Stay">
              <img
                id="stayplan-brand-logo"
                src={ASSETS.LOGO}
                alt="StayPlan Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-xs object-cover border border-slate-200 transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                  Stay<span className="text-teal-600">Plan</span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-950 border border-teal-200/80 text-[11px] font-bold">
                  <Shield className="w-3 h-3 text-teal-600" />
                  <span>Personal</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden md:block">
                Edisi Peribadi • Penyelarasan Awan Firestore
              </p>
            </div>
          </div>

          {/* Active Stay Selector Pill */}
          {activeStay && (
            <div className="hidden lg:flex items-center max-w-sm xl:max-w-md">
              <button
                id="header-stay-pill-btn"
                onClick={onOpenStayList}
                className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all text-left truncate cursor-pointer"
                title="Tukar atau Urus Stay"
              >
                <span className="text-base shrink-0">{stayTypeMeta?.icon || '🏡'}</span>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-teal-950 truncate">
                    {activeStay.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {activeStay.location} • {activeStay.durationDays} Hari
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 shrink-0 ml-1" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Realtime Cloud Sync Status & Refresh Button */}
            <button
              id="header-save-sync-btn"
              onClick={handleManualRefresh}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer ${
                syncStatus === 'ERROR'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : syncStatus === 'OFFLINE'
                  ? 'bg-slate-500 text-white'
                  : isSyncing || syncStatus === 'SAVING' || syncStatus === 'SYNCING'
                  ? 'bg-teal-500 hover:bg-teal-600 text-white animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
              title="Penyelarasan Firestore Automatik. Klik untuk refresh dari cloud."
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || syncStatus === 'SAVING' || syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {syncStatus === 'SAVING' || isSyncing || syncStatus === 'SYNCING'
                  ? 'Syncing...'
                  : syncStatus === 'OFFLINE'
                  ? 'Offline'
                  : syncStatus === 'ERROR'
                  ? 'Sync Gagal'
                  : 'Cloud Synced'}
              </span>
              <span className="sm:hidden">
                {isSyncing ? 'Syncing...' : 'Sync'}
              </span>
            </button>

            {/* All Stays Button */}
            <button
              id="header-all-stays-btn"
              onClick={onOpenStayList}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Senarai Semua Stay"
            >
              <FolderKanban className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Semua Stay</span>
            </button>

            {/* Share / Export */}
            <button
              id="header-share-btn"
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Kongsi ke WhatsApp atau Cetak"
            >
              <Share2 className="w-4 h-4 text-teal-600" />
              <span className="hidden sm:inline">Kongsi</span>
            </button>

            {/* New Stay Button */}
            <button
              id="header-new-stay-btn"
              onClick={onOpenNewStay}
              title="Cipta Stay Baharu"
              aria-label="Cipta Stay Baharu"
              className="inline-flex items-center justify-center p-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 rounded-xl shadow-xs shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Owner Profile & Security Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                id="user-profile-menu-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
                title="Menu Pemilik"
              >
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                  👑
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
                    Pemilik
                  </p>
                  <p className="text-[10px] text-teal-700 font-semibold uppercase tracking-wider">
                    {role}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      StayPlan Personal Owner
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email || 'owner@stayplan.personal'}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-950 border border-teal-200 uppercase inline-flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-teal-600" />
                        Akses Penuh Pemilik
                      </span>
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleManualRefresh();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 text-teal-600 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Refresh from Cloud</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenStayList();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <FolderKanban className="w-4 h-4 text-slate-500" />
                      <span>Semua Stay Peribadi Saya</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        lockApp();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-teal-950 hover:bg-teal-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-teal-600" />
                      <span>Kunci Aplikasi (Lock)</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log Keluar Sesi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Sync Status Toast */}
      {syncFeedback && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 max-w-md">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="leading-snug">{syncFeedback}</span>
          </div>
        </div>
      )}
    </header>
  );
};
