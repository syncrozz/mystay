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
import { ShareExportModal } from './components/ShareExportModal';
import { AuthModal } from './components/AuthModal';
import { SaveSyncFloatingBar } from './components/SaveSyncFloatingBar';
import { PrivateAccessScreen } from './components/PrivateAccessScreen';
import { STAY_TYPES } from './utils/constants';
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
  Lock,
  Compass
} from 'lucide-react';

function StayPlanApp() {
  const {
    stays,
    activeStay,
    activeAgendaItems,
    activeChecklistItems,
    addStay,
    updateStay,
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

  const { user, isUnlocked, isAdminMode, openAdminModal } = useAuth();

  // Modals state
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isStayListOpen, setIsStayListOpen] = useState(false);
  const [isCreateStayOpen, setIsCreateStayOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<Stay | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Activity Modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AgendaItem | null>(null);
  const [defaultDay, setDefaultDay] = useState(0); // 0 = Unscheduled pool / Backlog
  const [defaultSlot, setDefaultSlot] = useState<TimeSlot>('flexible');

  // Main navigation tab: 'plan' | 'calendar' | 'checklist' | 'info'
  const [activeTab, setActiveTab] = useState<'plan' | 'calendar' | 'checklist' | 'info'>('plan');

  const typeMeta = activeStay ? STAY_TYPES[activeStay.type] || STAY_TYPES.custom : null;

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

  const handleSaveStay = (stayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingStay) {
      updateStay(editingStay.id, stayData);
    } else {
      addStay(stayData);
    }
  };

  const handleOpenNewStay = () => {
    setEditingStay(null);
    setIsCreateStayOpen(true);
  };

  // If app is not unlocked by the owner PIN, render the Private Access Screen
  if (!isUnlocked) {
    return <PrivateAccessScreen />;
  }

  // If owner has 0 stays or no active stay, render clean, structured workspace empty state
  if (!activeStay) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50/60 font-sans text-slate-900">
        <Header
          onOpenNewStay={handleOpenNewStay}
          onOpenStayList={() => setIsStayListOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
          {/* 1. Page Context Bar */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Rancangan Saya
              </h1>
            </div>
          </div>

          {/* 2. Structured Empty State Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600">
              <Compass className="w-6 h-6 text-teal-600 stroke-[1.75]" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900">Belum ada rancangan</p>
              <p className="text-xs text-slate-500 font-medium max-w-xs">
                Mula merancang perjalanan, percutian atau balik kampung anda.
              </p>
            </div>

            <div className="pt-1">
              <button
                onClick={handleOpenNewStay}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>+ Rancang Perjalanan</span>
              </button>
            </div>
          </div>

          {/* 3. Functional Quick Access Area */}
          <div className="space-y-2.5">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Akses Pantas
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              {/* Shortcut 2: Rancangan Baharu */}
              <button
                type="button"
                onClick={handleOpenNewStay}
                className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition-all text-left shadow-2xs group flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 group-hover:text-teal-950">
                      Rancangan Baharu
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Mulakan rancangan baharu
                  </p>
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-600 shrink-0 font-bold">+</span>
              </button>

              {/* Shortcut 3: Kawalan Pentadbir / PIN */}
              <button
                type="button"
                onClick={() => openAdminModal('Masukkan PIN Admin untuk mengurus akses peribadi.')}
                className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition-all text-left shadow-2xs group flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isAdminMode ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-900 group-hover:text-teal-950">
                      Mod Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {isAdminMode ? 'Admin aktif (Unlocked)' : 'Kunci PIN keselamatan'}
                  </p>
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-600 shrink-0 font-bold">
                  {isAdminMode ? '✓' : '🔒'}
                </span>
              </button>
            </div>
          </div>
        </main>

        <Footer onOpenSupport={() => setIsSupportOpen(true)} />

        <CreateEditStayModal
          isOpen={isCreateStayOpen}
          onClose={() => setIsCreateStayOpen(false)}
          onSave={handleSaveStay}
          initialStay={editingStay}
        />
        <StaySelectorModal
          isOpen={isStayListOpen}
          onClose={() => setIsStayListOpen(false)}
          onNewStay={handleOpenNewStay}
          onEditStay={handleOpenEditStay}
        />
        <AuthModal />
        <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 font-sans text-slate-900">
      {/* App Header */}
      <Header
        onOpenNewStay={handleOpenNewStay}
        onOpenStayList={() => setIsStayListOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 overflow-hidden">
        
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

        {/* View Navigation Tabs: Compact & Efficient */}
        <div className="flex border-b border-slate-200 gap-1 sm:gap-2 text-xs sm:text-sm font-bold overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Perancangan ({activeAgendaItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalendar ({activeStay.durationDays || 3} Hari)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Senarai Semak ({activeChecklistItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Info Stay</span>
          </button>
        </div>

        {/* Tab 1: Perancangan Aktiviti (List & Organise) */}
        {activeTab === 'plan' && (
          <PlanBoard
            stay={activeStay}
            onOpenAddModal={() => handleOpenNewActivity(0, 'flexible')}
            onEditItem={handleOpenEditActivity}
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

      {/* Floating Save & Sync notification bar */}
      <SaveSyncFloatingBar />

      {/* Lightweight PIN Verification Gate Modal */}
      <AuthModal />
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
