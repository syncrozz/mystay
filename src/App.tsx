import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StayProvider, useStay } from './context/StayContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PlanBoard } from './components/PlanBoard';
import { CalendarView } from './components/CalendarView';
import { PackingChecklist } from './components/PackingChecklist';
import { StayInfoCard } from './components/StayInfoCard';
import { SupportModal } from './components/SupportModal';
import { CreateEditStayModal } from './components/CreateEditStayModal';
import { StaySelectorModal } from './components/StaySelectorModal';
import { ActivityModal } from './components/ActivityModal';
import { ActivityLibraryModal } from './components/ActivityLibraryModal';
import { ShareExportModal } from './components/ShareExportModal';
import { DataSafetyModal } from './components/DataSafetyModal';
import { SaveSyncFloatingBar } from './components/SaveSyncFloatingBar';
import { LoginScreen } from './components/LoginScreen';
import { STAY_TYPES, ASSETS } from './utils/constants';
import { formatDateRange, formatStaySummary, getLocalTodayDate, getLocalDateWithOffset } from './utils/formatters';
import { Stay, AgendaItem, TimeSlot } from './types';
import {
  Calendar,
  MapPin,
  Users,
  Share2,
  ListChecks,
  Home,
  Sparkles,
  Plus,
  Cloud,
  RefreshCw,
  FolderKanban,
  ShieldCheck,
  Compass,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Layers,
  CheckCircle2,
  Pencil
} from 'lucide-react';

function StayPlanApp() {
  const {
    stays,
    activeStay,
    activeStayId,
    setActiveStayId,
    activeAgendaItems,
    activeChecklistItems,
    addStay,
    updateStay,
    deleteStay,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    toggleAgendaComplete,
    addChecklistItem,
    toggleChecklistComplete,
    deleteChecklistItem,
    isLoadingStays,
    isSyncing,
    syncStatus,
    refreshFromCloud
  } = useStay();

  const { user, isLoading: isAuthLoading } = useAuth();

  // Navigation mode: 'landing' (My StayPlan landing / Stay selection) vs 'workspace' (Trip Planning Workspace)
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');

  // Modals state
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isStayListOpen, setIsStayListOpen] = useState(false);
  const [isCreateStayOpen, setIsCreateStayOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<Stay | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDataSafetyOpen, setIsDataSafetyOpen] = useState(false);
  const [isActivityLibraryOpen, setIsActivityLibraryOpen] = useState(false);

  // Activity Modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AgendaItem | null>(null);
  const [defaultDay, setDefaultDay] = useState(0); // 0 = Unscheduled pool / Backlog
  const [defaultSlot, setDefaultSlot] = useState<TimeSlot>('flexible');

  // Main navigation tab: 'plan' | 'calendar' | 'checklist' | 'info'
  const [activeTab, setActiveTab] = useState<'plan' | 'calendar' | 'checklist' | 'info'>('plan');

  const typeMeta = activeStay ? STAY_TYPES[activeStay.type] || STAY_TYPES.custom : null;

  const handleSelectStay = (stayId: string) => {
    setActiveStayId(stayId);
    setViewMode('workspace');
  };

  const handleNavigateToLanding = () => {
    setViewMode('landing');
  };

  const handleOpenNewActivity = (dayNumber: number, slot: TimeSlot) => {
    setEditingActivity(null);
    setDefaultDay(dayNumber);
    setDefaultSlot(slot);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (item: AgendaItem) => {
    setEditingActivity(item);
    setDefaultDay(item.dayNumber);
    setDefaultSlot(item.timeSlot);
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (itemData: Omit<AgendaItem, 'id'>) => {
    if (editingActivity) {
      updateAgendaItem(editingActivity.id, itemData);
    } else {
      addAgendaItem(itemData);
    }
  };

  const handleOpenEditStay = (stayToEdit: Stay) => {
    setEditingStay(stayToEdit);
    setIsCreateStayOpen(true);
  };

  const handleDeleteStay = async (stayId: string) => {
    await deleteStay(stayId);
    if (activeStayId === stayId) {
      setViewMode('landing');
    }
  };

  const handleSaveStay = async (stayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingStay) {
      await updateStay(editingStay.id, stayData);
    } else {
      const newId = await addStay(stayData);
      if (newId) {
        setActiveStayId(newId);
        setViewMode('workspace');
      }
    }
  };

  const handleOpenNewStay = () => {
    setEditingStay(null);
    setIsCreateStayOpen(true);
  };

  // 1. Initial authentication loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans text-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <img
              src={ASSETS.LOGO}
              alt="StayPlan"
              className="w-16 h-16 rounded-2xl shadow-sm object-cover border border-slate-200 animate-pulse"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500"></span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span>Memuatkan sesi StayPlan...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Mandatory Google Authentication Gate (SES v4.5 Phase 5)
  // Every user MUST authenticate using Google Authentication before accessing the workspace.
  if (!user) {
    return <LoginScreen />;
  }

  // 3. Post-Login Routing: Contextual Landing View (SES v4.5 Phase 5)
  // - First-time user (0 stays): Welcoming empty state with explanation & + Rancang Stay Pertama
  // - Single stay user (1 stay): Direct summary card with prominent "Teruskan Merancang →"
  // - Multiple stays user (>1 stay): My StayPlan landing listing all stays for user choice (no silent arbitrary stay opening)
  if (viewMode === 'landing' || !activeStay) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/60 font-sans text-slate-900">
        <Header
          onOpenNewStay={handleOpenNewStay}
          onOpenStayList={() => setIsStayListOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
          onOpenDataSafety={() => setIsDataSafetyOpen(true)}
          onOpenActivityLibrary={() => setIsActivityLibraryOpen(true)}
          onNavigateToLanding={handleNavigateToLanding}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
          {/* SCENARIO A: First-time Google user with zero stays */}
          {stays.length === 0 ? (
            <div className="space-y-6">
              {/* Context Header */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-950 text-xs font-bold mb-1.5">
                    <Compass className="w-3.5 h-3.5 text-teal-600" />
                    <span>Selamat Datang ke StayPlan</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Rancangan Pertama Anda
                  </h1>
                </div>
              </div>

              {/* Welcoming Hero Panel */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 text-center flex flex-col items-center justify-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-2xs">
                  <Compass className="w-8 h-8 stroke-[1.75]" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Mulakan Perancangan Short Stay Anda
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                    StayPlan direka khas untuk short stay 2–4 hari seperti balik kampung, percutian keluarga atau weekend getaway. Catat aktiviti yang dirancang, agihkan mengikut hari, dan pantau dalam Kalendar visual.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    id="welcome-create-first-stay-btn"
                    onClick={handleOpenNewStay}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Rancang Stay Pertama Anda</span>
                  </button>
                </div>
              </div>

              {/* 3 Core Value Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-teal-700 font-bold text-xs">
                    <Compass className="w-4 h-4" />
                    <span>1. Rancang Pantas</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Senaraikan aktiviti atau idea tanpa sekatan borang rumit.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>2. Kalendar Bersepadu</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Susun aktiviti mengikut hari dan slot masa secara teratur.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>3. Awan Firestore</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Disimpan selamat mengikut akaun Google peribadi anda.
                  </p>
                </div>
              </div>
            </div>
          ) : stays.length === 1 ? (
            /* SCENARIO B: Returning user with exactly one stay */
            <div className="space-y-6">
              {/* Context Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Rancangan Saya
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Selamat kembali{user?.displayName ? `, ${user.displayName}` : ''}! Teruskan merancang stay aktif anda.
                  </p>
                </div>
              </div>

              {/* Single Stay Featured Card */}
              {(() => {
                const stay = stays[0];
                const meta = STAY_TYPES[stay.type] || STAY_TYPES.custom;
                return (
                  <div
                    onClick={() => handleSelectStay(stay.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectStay(stay.id);
                      }
                    }}
                    className="group bg-white rounded-3xl border-2 border-teal-500/30 hover:border-teal-500 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all space-y-5 relative overflow-hidden cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-2.5 rounded-2xl bg-teal-50 border border-teal-200 shadow-2xs">
                          {meta.icon}
                        </span>
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-950 border border-teal-200 text-[10px] font-bold uppercase">
                            {meta.label}
                          </span>
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-teal-950 transition-colors tracking-tight mt-0.5">
                            {stay.title}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Stay Aktif</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditStay(stay);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title="Edit Maklumat Trip"
                          aria-label={`Edit ${stay.title}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="font-semibold text-slate-800">{stay.location || 'Lokasi belum ditetapkan'}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>{formatDateRange(stay.startDate, stay.endDate, stay.durationDays)}</span>
                      </span>

                      {stay.companions && stay.companions.length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>{stay.companions.length} Tetamu</span>
                        </span>
                      )}
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="font-bold text-teal-700">{activeAgendaItems.length}</span>
                        <span>Aktiviti Dirancang</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="font-bold text-amber-700">{activeChecklistItems.length}</span>
                        <span>Barang Senarai Semak</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* SCENARIO C: Returning user with multiple stays (Landing stay selector) */
            <div className="space-y-6">
              {/* Context Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Rancangan Saya
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-950 text-xs font-bold">
                      {stays.length} Stay
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Pilih rancangan stay untuk terus menyusun agenda atau melihat kalendar perjalanan anda.
                  </p>
                </div>
              </div>

              {/* Grid of All Existing Stays */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stays.map((stay) => {
                  const isActive = stay.id === activeStayId;
                  const meta = STAY_TYPES[stay.type] || STAY_TYPES.custom;

                  return (
                    <div
                      key={stay.id}
                      onClick={() => handleSelectStay(stay.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectStay(stay.id);
                        }
                      }}
                      className={`group p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 bg-white shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden ${
                        isActive
                          ? 'border-teal-500 ring-2 ring-teal-500/20'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-950 border border-teal-200 text-xs font-bold inline-flex items-center gap-1.5">
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-teal-600 text-white">
                                Aktif Sekarang
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditStay(stay);
                              }}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Edit Maklumat Trip"
                              aria-label={`Edit ${stay.title}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-teal-950 transition-colors">
                            {stay.title}
                          </h2>
                          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="truncate">{stay.location || 'Lokasi belum ditetapkan'}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDateRange(stay.startDate, stay.endDate, stay.durationDays)}</span>
                          </span>

                          {stay.companions && stay.companions.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{stay.companions.length} Tetamu</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Access Area */}
          <div className="space-y-2.5 pt-2">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Akses Pantas
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {/* Shortcut 1: Rancangan Tersimpan */}
              <button
                type="button"
                onClick={() => setIsStayListOpen(true)}
                className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition-all text-left shadow-2xs group flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 group-hover:text-teal-950">
                      Rancangan Tersimpan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {stays.length > 0 ? `${stays.length} rancangan tersimpan` : 'Lihat dan urus rancangan anda'}
                  </p>
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-600 shrink-0 font-bold">→</span>
              </button>
            </div>
          </div>
        </main>

        <Footer onOpenSupport={() => setIsSupportOpen(true)} />

        <CreateEditStayModal
          isOpen={isCreateStayOpen}
          onClose={() => setIsCreateStayOpen(false)}
          onSave={handleSaveStay}
          onDelete={handleDeleteStay}
          initialStay={editingStay}
        />
        <StaySelectorModal
          isOpen={isStayListOpen}
          onClose={() => setIsStayListOpen(false)}
          onNewStay={handleOpenNewStay}
          onEditStay={handleOpenEditStay}
          onSelectStay={handleSelectStay}
        />
        <DataSafetyModal
          isOpen={isDataSafetyOpen}
          onClose={() => setIsDataSafetyOpen(false)}
        />
        <ActivityLibraryModal
          isOpen={isActivityLibraryOpen}
          onClose={() => setIsActivityLibraryOpen(false)}
        />
        <ShareExportModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          stay={activeStay}
          agendaItems={activeAgendaItems}
          checklistItems={activeChecklistItems}
        />
        <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      </div>
    );
  }

  // 4. Trip Planning Workspace (SES v4.5 Visual Identity Preserved)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 font-sans text-slate-900">
      {/* App Header */}
      <Header
        onOpenNewStay={handleOpenNewStay}
        onOpenStayList={() => setIsStayListOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenDataSafety={() => setIsDataSafetyOpen(true)}
        onOpenActivityLibrary={() => setIsActivityLibraryOpen(true)}
        onNavigateToLanding={handleNavigateToLanding}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 overflow-hidden">
        
        {/* Contextual Navigation Bar (SES v4.5 Navigation Refinement) */}
        <div className="flex items-center justify-between gap-2 pb-0.5">
          <button
            onClick={handleNavigateToLanding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-teal-950 transition-all cursor-pointer shadow-2xs group"
            title="Kembali ke Senarai Rancangan Saya"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Rancangan Saya</span>
          </button>

          {stays.length > 1 && (
            <button
              onClick={() => setIsStayListOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-xs font-bold text-slate-700 hover:text-teal-950 transition-all cursor-pointer shadow-2xs"
              title="Tukar ke Rancangan Stay yang lain"
            >
              <FolderKanban className="w-3.5 h-3.5 text-teal-600" />
              <span>Tukar Stay ({stays.length})</span>
            </button>
          )}
        </div>

        {/* Stay Hero Card - Compact Workspace Header */}
        <section id="stay-hero-banner" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3 relative overflow-hidden w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Stay Title & Metadata */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-950 border border-teal-200 text-[11px] font-bold inline-flex items-center gap-1">
                  <span>{typeMeta?.icon}</span>
                  <span>{typeMeta?.label}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                  {formatStaySummary(activeStay)}
                </span>
              </div>

              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight break-words">
                {activeStay.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="break-words">{activeStay.location || 'Lokasi belum ditetapkan'}</span>
                </span>

                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{formatDateRange(activeStay.startDate, activeStay.endDate, activeStay.durationDays)}</span>
                </span>

                {activeStay.companions && activeStay.companions.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{activeStay.companions.length} Tetamu</span>
                  </span>
                )}
              </div>
            </div>

            {/* Secondary Actions: Edit & Kongsi */}
            <div className="flex items-center gap-1.5 shrink-0 pt-1 md:pt-0">
              {stays.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsStayListOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  title="Tukar ke stay lain"
                >
                  <span>Tukar Stay</span>
                </button>
              )}

              <button
                id="hero-edit-stay-btn"
                type="button"
                onClick={() => handleOpenEditStay(activeStay)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <span>Edit</span>
              </button>

              <button
                id="hero-share-btn"
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-teal-700" />
                <span>Kongsi</span>
              </button>
            </div>

          </div>
        </section>

        {/* View Navigation Tabs: Compact & Efficient (Preserving Visual Identity with Refined Hierarchy) */}
        <div className="flex border-b border-slate-200 gap-1 sm:gap-2 text-xs sm:text-sm font-bold overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`pb-2.5 px-3.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'border-teal-600 text-teal-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Perancangan</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'plan' ? 'bg-teal-100 text-teal-950' : 'bg-slate-100 text-slate-600'
            }`}>
              {activeAgendaItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`pb-2.5 px-3.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-teal-600 text-teal-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Kalendar</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'calendar' ? 'bg-teal-100 text-teal-950' : 'bg-slate-100 text-slate-600'
            }`}>
              {activeStay.durationDays || 3} Hari
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-2.5 px-3.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-teal-600 text-teal-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListChecks className="w-4 h-4 text-amber-600" />
            <span>Senarai Semak</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'checklist' ? 'bg-teal-100 text-teal-950' : 'bg-slate-100 text-slate-600'
            }`}>
              {activeChecklistItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-3.5 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'border-teal-600 text-teal-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-600" />
            <span>Info Stay</span>
          </button>
        </div>

        {/* Tab 1: Perancangan Aktiviti (List & Organise) */}
        {activeTab === 'plan' && (
          <PlanBoard
            stay={activeStay}
            onOpenAddModal={() => handleOpenNewActivity(0, 'flexible')}
            onEditItem={handleOpenEditActivity}
            onOpenActivityLibrary={() => setIsActivityLibraryOpen(true)}
          />
        )}

        {/* Tab 2: Calendar View (Visual Multi-day Schedule & Details) */}
        {activeTab === 'calendar' && (
          <CalendarView
            stay={activeStay}
            agendaItems={activeAgendaItems}
            onAddItem={handleOpenNewActivity}
            onEditItem={handleOpenEditActivity}
            onNavigateToPlan={() => setActiveTab('plan')}
            onToggleComplete={(id) => {
              toggleAgendaComplete(id);
            }}
          />
        )}

        {/* Tab 3: Packing Checklist */}
        {activeTab === 'checklist' && (
          <PackingChecklist
            items={activeChecklistItems}
            stay={activeStay}
            onAddItem={(item) => {
              addChecklistItem(item);
            }}
            onToggleItem={(id) => {
              toggleChecklistComplete(id);
            }}
            onDeleteItem={(id) => {
              deleteChecklistItem(id);
            }}
          />
        )}

        {/* Tab 4: Stay & Wi-Fi Info */}
        {activeTab === 'info' && (
          <StayInfoCard
            stay={activeStay}
            onEditStay={() => handleOpenEditStay(activeStay)}
          />
        )}

      </main>

      {/* App Footer */}
      <Footer onOpenSupport={() => setIsSupportOpen(true)} />

      {/* Modals */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <StaySelectorModal
        isOpen={isStayListOpen}
        onClose={() => setIsStayListOpen(false)}
        onNewStay={handleOpenNewStay}
        onEditStay={(stay) => handleOpenEditStay(stay)}
      />

      <CreateEditStayModal
        isOpen={isCreateStayOpen}
        onClose={() => setIsCreateStayOpen(false)}
        onSave={handleSaveStay}
        onDelete={handleDeleteStay}
        initialStay={editingStay}
      />

      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveActivity}
        initialItem={editingActivity}
        defaultDayNumber={defaultDay}
        defaultTimeSlot={defaultSlot}
        stay={activeStay}
      />

      <ShareExportModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        stay={activeStay}
        agendaItems={activeAgendaItems}
        checklistItems={activeChecklistItems}
      />

      <DataSafetyModal
        isOpen={isDataSafetyOpen}
        onClose={() => setIsDataSafetyOpen(false)}
      />

      <ActivityLibraryModal
        isOpen={isActivityLibraryOpen}
        onClose={() => setIsActivityLibraryOpen(false)}
      />

      {/* Floating Save & Sync notification bar */}
      <SaveSyncFloatingBar />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StayProvider>
        <StayPlanApp />
      </StayProvider>
    </AuthProvider>
  );
}
