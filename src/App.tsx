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
  RefreshCw
} from 'lucide-react';

function StayPlanApp() {
  const {
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

  const { user, isUnlocked, isLoading: isAuthLoading, openAuthModal } = useAuth();
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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

  // Quick Starter Templates for empty personal workspace
  const handleCreateStarterStay = (templateType: 'balik_kampung' | 'homestay' | 'short_getaway') => {
    const today = getLocalTodayDate();
    const end3Days = getLocalDateWithOffset(2, today);
    const end2Days = getLocalDateWithOffset(1, today);

    if (templateType === 'balik_kampung') {
      addStay({
        title: 'Balik Kampung Hujung Minggu',
        type: 'balik_kampung',
        durationDays: 3,
        startDate: today,
        endDate: end3Days,
        location: 'Rumah Tok, Kampung',
        companions: ['Keluarga'],
        importantNotes: 'Fokus santai bersama orang tua dan elakkan jadual terlalu padat.'
      });
    } else if (templateType === 'homestay') {
      addStay({
        title: 'Percutian Homestay Keluarga',
        type: 'homestay',
        durationDays: 3,
        startDate: today,
        endDate: end3Days,
        location: 'Homestay Santai',
        companions: ['Keluarga & Anak-anak'],
        importantNotes: 'Masa rehat dan aktiviti santai bersama anak-anak.'
      });
    } else {
      addStay({
        title: 'Weekend Getaway Santai',
        type: 'short_getaway',
        durationDays: 2,
        startDate: today,
        endDate: end2Days,
        location: 'Short Stay Destination',
        companions: ['Pasangan / Kawan'],
        importantNotes: 'Recharge tenaga dan nikmati makanan enak.'
      });
    }
  };

  // If app is not unlocked by the owner PIN, render the Private Access Screen
  if (!isUnlocked) {
    return <PrivateAccessScreen />;
  }

  // If owner has 0 stays, render welcoming onboarding
  if (!activeStay) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
        <Header
          onOpenNewStay={handleOpenNewStay}
          onOpenStayList={() => setIsStayListOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center space-y-8">
          <div className="inline-flex p-4 rounded-3xl bg-teal-100/70 text-teal-700 border border-teal-200">
            <Sparkles className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Selamat Datang ke StayPlan Personal!
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ruang StayPlan anda adalah milik persendirian dan diselaraskan terus ke Firestore. Mulakan dengan mencipta perancangan short stay 2–4 hari pertama anda.
            </p>
          </div>

          {/* Starter Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-xl text-left">
            <button
              onClick={() => handleCreateStarterStay('balik_kampung')}
              className="p-4 rounded-2xl bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-400 transition-all group shadow-2xs cursor-pointer"
            >
              <span className="text-2xl">🏡</span>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-950 mt-2">
                Balik Kampung
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">3 Hari 2 Malam bersama orang tua</p>
            </button>

            <button
              onClick={() => handleCreateStarterStay('homestay')}
              className="p-4 rounded-2xl bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-400 transition-all group shadow-2xs cursor-pointer"
            >
              <span className="text-2xl">🏊‍♂️</span>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-950 mt-2">
                Percutian Homestay
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">3 Hari 2 Malam keluarga besar</p>
            </button>

            <button
              onClick={() => handleCreateStarterStay('short_getaway')}
              className="p-4 rounded-2xl bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-400 transition-all group shadow-2xs cursor-pointer"
            >
              <span className="text-2xl">🌿</span>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-950 mt-2">
                Weekend Getaway
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">2 Hari 1 Malam recharge santai</p>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={handleOpenNewStay}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cipta Stay Kustom Baharu</span>
            </button>
          </div>
        </main>

        <Footer onOpenSupport={() => setIsSupportOpen(true)} />

        <CreateEditStayModal
          isOpen={isCreateStayOpen}
          onClose={() => setIsCreateStayOpen(false)}
          onSave={handleSaveStay}
          initialStay={editingStay}
        />
        <AuthModal />
      </div>
    );
  }

  if (!activeStay) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="text-center space-y-4">
          <p className="text-slate-600">Tiada perancangan stay dipilih.</p>
          <button
            onClick={() => setIsStayListOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl cursor-pointer"
          >
            Pilih Stay
          </button>
        </div>
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

      {/* Realtime Sync Status Banner */}
      <div className="bg-teal-50/80 border-b border-teal-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-3 text-[11px] text-teal-950">
          <div className="flex items-center gap-1.5 min-w-0">
            <Cloud className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="truncate">
              <strong>StayPlan Personal:</strong> Penyelarasan Awan Masa Nyata Aktif di Semua Peranti.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                const res = await refreshFromCloud({ forceFetch: true });
                setSyncFeedback(res.message);
                setTimeout(() => setSyncFeedback(null), 4000);
              }}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-teal-950 bg-white hover:bg-teal-100 border border-teal-300 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Refresh from Cloud"
            >
              <RefreshCw className={`w-3 h-3 text-teal-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Refresh from Cloud'}</span>
            </button>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
              ● {syncStatus === 'SAVING' || syncStatus === 'SYNCING' ? 'Syncing...' : syncStatus === 'ERROR' ? 'Sync Gagal' : syncStatus === 'OFFLINE' ? 'Offline' : 'Synced'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Stay Hero Card */}
        <section id="stay-hero-banner" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Stay Title & Metadata */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-950 border border-teal-200/80 text-xs font-bold inline-flex items-center gap-1.5">
                  <span>{typeMeta?.icon}</span>
                  <span>{typeMeta?.label}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/80">
                  {formatStaySummary(activeStay)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  Personal Stay
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeStay.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{activeStay.location || 'Lokasi Belum Ditetapkan'}</span>
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{formatDateRange(activeStay.startDate, activeStay.endDate, activeStay.durationDays)}</span>
                </span>

                {activeStay.companions && activeStay.companions.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{activeStay.companions.length} Ahli / Tetamu ({activeStay.companions.join(', ')})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Hero Quick Actions: Perancangan, Kalendar, Edit Stay & Share */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
              <button
                id="hero-plan-btn"
                type="button"
                onClick={() => setActiveTab('plan')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black rounded-xl transition-all shadow-2xs cursor-pointer ${
                  activeTab === 'plan'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>📝 Perancangan</span>
              </button>

              <button
                id="hero-calendar-btn"
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>📅 Kalendar</span>
              </button>

              <button
                id="hero-edit-stay-btn"
                type="button"
                onClick={() => handleOpenEditStay(activeStay)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <span>✏️ Edit</span>
              </button>

              <button
                id="hero-share-btn"
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kongsi</span>
              </button>
            </div>

          </div>
        </section>

        {/* View Navigation Tabs: Step Flow Structure */}
        <div className="flex border-b border-slate-200 gap-1 sm:gap-2 text-xs sm:text-sm font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📝</span>
            <span>1. Perancangan ({activeAgendaItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Kalendar ({activeStay.durationDays || 3} Hari)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>3. Senarai Semak ({activeChecklistItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>4. Info Homestay</span>
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
