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
  Unlock,
  LogOut,
  Shield,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  onOpenNewStay: () => void;
  onOpenStayList: () => void;
  onOpenShare: () => void;
  onOpenSupport?: () => void;
  onOpenDataSafety?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewStay,
  onOpenStayList,
  onOpenShare,
  onOpenDataSafety
}) => {
  const {
    activeStay,
    isSyncing,
    syncStatus,
    refreshFromCloud
  } = useStay();
  const {
    isAdminMode,
    openAdminModal,
    deactivateAdminMode,
    requireAdmin
  } = useAuth();
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

  const handleNewStayClick = () => {
    requireAdmin(onOpenNewStay, 'Sila masukkan PIN Admin untuk memulakan rancangan baharu.');
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
    <header id="stayplan-main-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20 gap-2 sm:gap-3">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <div className="relative group cursor-pointer shrink-0" onClick={onOpenStayList} title="Pilih atau Tukar Rancangan">
              <img
                id="stayplan-brand-logo"
                src={ASSETS.LOGO}
                alt="StayPlan Logo"
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl shadow-xs object-cover border border-slate-200 transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-teal-500"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                  Stay<span className="text-teal-600">Plan</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-950 border border-teal-200/80 text-[11px] font-bold">
                  <Shield className="w-3 h-3 text-teal-600" />
                  <span>Personal</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden md:block">
                Edisi Peribadi • Penyelarasan Awan Firestore
              </p>
            </div>
          </div>

          {/* Active Stay Selector Pill (Desktop) */}
          {activeStay && (
            <div className="hidden lg:flex items-center max-w-sm xl:max-w-md">
              <button
                id="header-stay-pill-btn"
                onClick={onOpenStayList}
                className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all text-left truncate cursor-pointer"
                title="Tukar atau Urus Rancangan"
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

          {/* Action Buttons (Responsive Icon Presentation) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Admin Mode Status / Toggle Indicator Button */}
            {isAdminMode ? (
              <button
                id="header-admin-mode-active-btn"
                onClick={deactivateAdminMode}
                className="inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl transition-all shadow-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer border border-emerald-500 shrink-0"
                title="Admin Mode Aktif (Klik untuk kunci/kembali ke Mod Paparan)"
                aria-label="Admin Mode Aktif"
              >
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                </span>
                <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            ) : (
              <button
                id="header-admin-mode-login-btn"
                onClick={() => openAdminModal('Sila masukkan 4-digit PIN keselamatan untuk membuka Mod Admin.')}
                className="inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl transition-all shadow-2xs bg-slate-100 hover:bg-teal-50 hover:text-teal-950 text-slate-800 border border-slate-200 hover:border-teal-300 active:scale-95 cursor-pointer shrink-0"
                title="Akses Mod Admin (Masukkan PIN)"
                aria-label="Akses Mod Admin"
              >
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
              </button>
            )}

            {/* All Stays Button (Desktop only on sm+) */}
            <button
              id="header-all-stays-btn"
              onClick={onOpenStayList}
              className="hidden sm:inline-flex items-center justify-center p-2 sm:p-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Rancangan Tersimpan"
              aria-label="Rancangan Tersimpan"
            >
              <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
            </button>

            {/* Share / Export */}
            <button
              id="header-share-btn"
              onClick={onOpenShare}
              className="inline-flex items-center justify-center p-2 sm:p-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Kongsi ke WhatsApp atau Cetak"
              aria-label="Kongsi Rancangan"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700" />
            </button>

            {/* New Stay Button (Admin Gated) */}
            <button
              id="header-new-stay-btn"
              onClick={handleNewStayClick}
              title={isAdminMode ? 'Rancangan Baharu' : 'Rancangan Baharu (Perlu Mod Admin)'}
              aria-label="Rancangan Baharu"
              className="inline-flex items-center justify-center p-2 sm:p-2.5 text-white bg-teal-600 hover:bg-teal-700 active:scale-95 rounded-xl shadow-xs shadow-teal-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Security Menu / Profile Dropdown */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                id="user-profile-menu-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 p-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
                title="Pilihan Keselamatan & Admin"
              >
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-2xs ${isAdminMode ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                  {isAdminMode ? '👑' : '👤'}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-500 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      StayPlan Personal
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isAdminMode ? 'Sesi Mod Pentadbir Aktif' : 'Mod Paparan Sahaja'}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase inline-flex items-center gap-1 ${
                        isAdminMode
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {isAdminMode ? 'Admin Unlocked' : 'Viewer Mode'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    {isAdminMode ? (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          deactivateAdminMode();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-slate-500" />
                        <span>Kunci Semula Mod Admin</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          openAdminModal('Sila masukkan 4-digit PIN keselamatan untuk membuka Mod Admin.');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-teal-950 bg-teal-50/70 hover:bg-teal-100 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-teal-600" />
                        <span>Buka Mod Admin (PIN)</span>
                      </button>
                    )}

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
                      <span>Rancangan Tersimpan</span>
                    </button>

                    {onOpenDataSafety && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenDataSafety();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-950 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-teal-700" />
                        <span>Data Safety (SES v4.4)</span>
                      </button>
                    )}
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
