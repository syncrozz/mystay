import React, { useState, useRef, useEffect } from 'react';
import { ASSETS, STAY_TYPES } from '../utils/constants';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Share2,
  FolderKanban,
  ChevronDown,
  LogOut,
  Shield,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Bookmark
} from 'lucide-react';

interface HeaderProps {
  onOpenNewStay: () => void;
  onOpenStayList: () => void;
  onOpenShare: () => void;
  onOpenSupport?: () => void;
  onOpenDataSafety?: () => void;
  onOpenActivityLibrary?: () => void;
  onNavigateToLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewStay,
  onOpenStayList,
  onOpenShare,
  onOpenDataSafety,
  onOpenActivityLibrary,
  onNavigateToLanding
}) => {
  const {
    activeStay,
    isSyncing,
    syncStatus,
    refreshFromCloud
  } = useStay();
  const {
    user,
    userProfile,
    signInWithGoogle,
    signOut,
    isAuthenticated
  } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
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

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
      setSyncFeedback('Berjaya log masuk dengan Google.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setSyncFeedback(err?.message || 'Gagal log masuk Google.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSyncFeedback('Telah log keluar.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err) {
      console.error('Sign Out failed:', err);
    }
  };

  const handleNewStayClick = () => {
    onOpenNewStay();
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
            <div
              className="relative group cursor-pointer shrink-0"
              onClick={onNavigateToLanding || onOpenStayList}
              title="Kembali ke Rancangan Saya"
              role="button"
              tabIndex={0}
            >
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

            <div
              className="min-w-0 cursor-pointer"
              onClick={onNavigateToLanding || onOpenStayList}
              title="Kembali ke Rancangan Saya"
            >
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
            {/* All Stays Button (Desktop only on sm+) */}
            <button
              id="header-all-stays-btn"
              onClick={onNavigateToLanding || onOpenStayList}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Rancangan Saya — Lihat dan pilih semua rancangan tersimpan"
              aria-label="Rancangan Saya"
            >
              <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700 shrink-0" />
              <span className="hidden md:inline text-xs font-bold">Rancangan Saya</span>
            </button>

            {/* Share / Export */}
            <button
              id="header-share-btn"
              onClick={onOpenShare}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Kongsi Rancangan ke WhatsApp atau Cetak"
              aria-label="Kongsi Rancangan"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700 shrink-0" />
              <span className="hidden lg:inline text-xs font-bold text-slate-800">Kongsi</span>
            </button>

            {/* New Stay Button */}
            <button
              id="header-new-stay-btn"
              onClick={handleNewStayClick}
              title="Cipta Rancangan Stay Baharu"
              aria-label="Cipta Rancangan Stay Baharu"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 text-white bg-teal-600 hover:bg-teal-700 active:scale-95 rounded-xl shadow-xs shadow-teal-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline text-xs font-black">+ Stay Baharu</span>
            </button>

            {/* Security Menu / Profile Dropdown */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                id="user-profile-menu-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
                title="Pilihan Keselamatan & Profil Pengguna"
                aria-label="Menu Profil dan Keselamatan"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-slate-300 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white font-bold text-[10px] sm:text-xs flex items-center justify-center shadow-2xs bg-teal-700">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '👤'}
                  </div>
                )}
                <ChevronDown className="w-3 h-3 text-slate-500 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user ? (user.displayName || 'Pengguna StayPlan') : 'StayPlan Personal'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user ? user.email : 'Mod Setempat (Simpanan Tempatan)'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {user ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-800 border border-teal-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          Cloud Synced
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-300">
                          Setempat
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    {/* Google Auth Button: Sign In or Sign Out */}
                    {user ? (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Log Keluar Google</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleGoogleSignIn();
                        }}
                        disabled={isSigningIn}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-teal-950 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors text-left cursor-pointer border border-teal-200"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>{isSigningIn ? 'Menyambungkan...' : 'Log Masuk dengan Google'}</span>
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

                    {onOpenActivityLibrary && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenActivityLibrary();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Bookmark className="w-4 h-4 text-teal-600" />
                        <span>Aktiviti Kebiasaan (Pautan Pantas)</span>
                      </button>
                    )}

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
