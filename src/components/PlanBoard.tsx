import React, { useState, useMemo } from 'react';
import { Stay, AgendaItem, TimeSlot, ActivityPriority } from '../types';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_CONFIG, TIME_SLOTS } from '../utils/constants';
import { getDayContextLabel, toTitleCase, parseActivityLines, getDateForDay } from '../utils/formatters';
import { OrganisePlanModal } from './OrganisePlanModal';
import {
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Edit2,
  Search,
  Check,
  MapPin,
  User,
  Lock,
  SlidersHorizontal
} from 'lucide-react';

interface PlanBoardProps {
  stay: Stay;
  onOpenAddModal?: () => void;
  onEditItem?: (item: AgendaItem) => void;
}

type FilterType = 'all' | 'backlog' | 'wajib' | 'optional' | 'scheduled';

const MALAYSIAN_STAY_IDEAS = [
  { title: 'Makan Nasi Dagang', priority: 'must_do' as ActivityPriority, icon: '🍚' },
  { title: 'Pergi Pantai', priority: 'optional' as ActivityPriority, icon: '🏖️' },
  { title: 'Gi Kenduri Ayoh Lie', priority: 'must_do' as ActivityPriority, icon: '🎉' },
  { title: 'Makan Kedai Kak Nurul', priority: 'optional' as ActivityPriority, icon: '🍜' },
  { title: 'Jumpa Keluarga', priority: 'must_do' as ActivityPriority, icon: '👨‍👩‍👧' },
  { title: 'Bawa Anak Jalan-Jalan', priority: 'optional' as ActivityPriority, icon: '🧒' },
  { title: 'Beli Keropok Lekor', priority: 'optional' as ActivityPriority, icon: '🍘' },
  { title: 'Ziarah Tok', priority: 'must_do' as ActivityPriority, icon: '👵' },
  { title: 'Singgah Rumah Ayah', priority: 'must_do' as ActivityPriority, icon: '🏡' },
  { title: 'Rehat Santai & Kopi Petang', priority: 'optional' as ActivityPriority, icon: '☕' }
];

export const PlanBoard: React.FC<PlanBoardProps> = ({
  stay,
  onOpenAddModal,
  onEditItem
}) => {
  const {
    activeAgendaItems,
    addAgendaItem,
    updateAgendaItem,
    batchUpdateAgendaItems,
    deleteAgendaItem,
    toggleAgendaComplete
  } = useStay();
  const { isAdminMode, requireAdmin } = useAuth();

  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<ActivityPriority>('must_do');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrganiseModalOpen, setIsOrganiseModalOpen] = useState(false);

  const duration = stay.durationDays || 3;

  // Filter items for this stay
  const items = useMemo(() => {
    return activeAgendaItems.filter((i) => i.stayId === stay.id);
  }, [activeAgendaItems, stay.id]);

  // Statistics
  const totalItems = items.length;
  const wajibCount = items.filter((i) => i.priority === 'must_do').length;
  const optionalCount = totalItems - wajibCount;
  const backlogCount = items.filter((i) => !i.dayNumber || i.dayNumber === 0).length;
  const scheduledCount = totalItems - backlogCount;

  // Helper to add parsed activities via existing addAgendaItem flow with single requireAdmin auth
  const addActivitiesBatch = (titles: string[]) => {
    if (titles.length === 0) return;

    requireAdmin(() => {
      // Clear input immediately so user can type next idea without delay
      setQuickTitle('');

      // Add item(s) using existing addAgendaItem flow
      titles.forEach((title) => {
        addAgendaItem({
          stayId: stay.id,
          title,
          dayNumber: 0, // 0 = Belum dijadualkan / Backlog Pool
          timeSlot: 'flexible',
          priority: quickPriority,
          isCompleted: false,
          locationName: '',
          personInCharge: '',
          description: '',
          notes: ''
        }).catch((err) => {
          console.error('Failed adding plan item:', err);
        });
      });
    }, 'Sila masukkan PIN Admin untuk menambah aktiviti.');
  };

  // Handle Frictionless Quick Add (Single-line submit & form submit fallback)
  const handleQuickAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseActivityLines(quickTitle);
    if (parsed.length === 0) return;

    addActivitiesBatch(parsed);
  };

  // Handle Multiline Paste directly on the quick-add input
  const handleQuickPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData?.getData('text');
    if (pasteText && (pasteText.includes('\n') || pasteText.includes('\r'))) {
      const parsed = parseActivityLines(pasteText);
      if (parsed.length > 0) {
        e.preventDefault();
        addActivitiesBatch(parsed);
      }
    }
  };

  // Add idea directly from quick Malaysian stay ideas chip (Admin Gated, Instant)
  const handleAddIdeaChip = (idea: { title: string; priority: ActivityPriority }) => {
    const exists = items.some((i) => i.title.toLowerCase() === idea.title.toLowerCase());
    if (exists) {
      setQuickTitle(idea.title);
      return;
    }

    requireAdmin(() => {
      addAgendaItem({
        stayId: stay.id,
        title: idea.title,
        dayNumber: 0,
        timeSlot: 'flexible',
        priority: idea.priority,
        isCompleted: false,
        locationName: '',
        personInCharge: '',
        description: '',
        notes: ''
      }).catch((err) => {
        console.error('Failed adding idea:', err);
      });
    }, 'Sila masukkan PIN Admin untuk menambah aktiviti daripada cadangan pantas.');
  };

  // Toggle priority between Wajib (must_do) and Pilihan (optional)
  const handleTogglePriority = async (item: AgendaItem) => {
    requireAdmin(async () => {
      const nextPriority: ActivityPriority = item.priority === 'must_do' ? 'optional' : 'must_do';
      await updateAgendaItem(item.id, { priority: nextPriority });
    }, 'Sila sahkan PIN Admin untuk menukar keutamaan aktiviti.');
  };

  // Quick assign day
  const handleAssignDay = async (item: AgendaItem, targetDay: number) => {
    requireAdmin(async () => {
      await updateAgendaItem(item.id, { dayNumber: targetDay });
    }, 'Sila sahkan PIN Admin untuk menjadualkan aktiviti.');
  };

  // Quick change time slot
  const handleAssignSlot = async (item: AgendaItem, targetSlot: TimeSlot) => {
    requireAdmin(async () => {
      await updateAgendaItem(item.id, { timeSlot: targetSlot });
    }, 'Sila sahkan PIN Admin untuk menukar slot masa aktiviti.');
  };

  // Handle Edit Item
  const handleEditClick = (item: AgendaItem) => {
    if (onEditItem) {
      requireAdmin(() => onEditItem(item), 'Sila sahkan PIN Admin untuk mengedit aktiviti.');
    }
  };

  // Handle Delete Item
  const handleDeleteClick = (itemId: string) => {
    requireAdmin(async () => {
      await deleteAgendaItem(itemId);
    }, 'Sila sahkan PIN Admin untuk memadam aktiviti.');
  };

  // Handle Susun Agenda
  const handleOrganiseClick = () => {
    requireAdmin(() => {
      setIsOrganiseModalOpen(true);
    }, 'Sila sahkan PIN Admin untuk menggunakan pembantu susun automatik agenda.');
  };

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter === 'backlog' && (item.dayNumber || 0) !== 0) return false;
      if (activeFilter === 'scheduled' && (item.dayNumber || 0) === 0) return false;
      if (activeFilter === 'wajib' && item.priority !== 'must_do') return false;
      if (activeFilter === 'optional' && item.priority === 'must_do') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        const matchesLoc = (item.locationName || '').toLowerCase().includes(query);
        const matchesPic = (item.personInCharge || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesPic) return false;
      }

      return true;
    });
  }, [items, activeFilter, searchQuery]);

  return (
    <div id="plan-board-view" className="space-y-4 max-w-6xl mx-auto">
      {/* Hero Empty State (When Planning is Empty) */}
      {totalItems === 0 ? (
        <div className="space-y-4">
          <div
            id="planning-hero-empty-state"
            className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-10 text-center space-y-6 max-w-2xl mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600 shadow-2xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Belum ada aktiviti
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Mulakan rancangan dengan menambah aktiviti pertama anda.
              </p>
            </div>

            {/* HERO ACTION: Tambah Aktiviti (Prominent & Unmissable) */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                id="hero-add-activity-btn"
                onClick={() => {
                  if (onOpenAddModal) {
                    requireAdmin(onOpenAddModal, 'Sila masukkan PIN Admin untuk menambah aktiviti.');
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-sm font-black rounded-2xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Aktiviti</span>
              </button>
            </div>

            {/* Quick Starter Form (Zero-friction alternative directly in empty state) */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Atau taip pantas & tekan Enter:
              </p>
              <form onSubmit={handleQuickAdd} className="flex items-center gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(toTitleCase(e.target.value))}
                  onPaste={handleQuickPaste}
                  placeholder="Cth: Makan Nasi Dagang / Pergi Pantai..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all animate-flash-5s"
                />
                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Tambah
                </button>
              </form>
            </div>

            {/* Starter Idea Chips */}
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold text-slate-400">
                Cadangan pantas untuk mula:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg mx-auto">
                {MALAYSIAN_STAY_IDEAS.slice(0, 6).map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddIdeaChip(idea)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-200 border border-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95"
                  >
                    <span>{idea.icon}</span>
                    <span>{idea.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Normal Planning Workspace (Progressive Disclosure when items exist) */
        <>
          {/* Fast Direct Input */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 space-y-3">
            <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  id="quick-brain-dump-input"
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(toTitleCase(e.target.value))}
                  onPaste={handleQuickPaste}
                  placeholder="Tambah aktiviti dirancang..."
                  className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all animate-flash-5s"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuickPriority('must_do')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickPriority === 'must_do'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🫪 Wajib
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPriority('optional')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      quickPriority === 'optional'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌿 Santai
                  </button>
                </div>

                <button
                  type="submit"
                  id="quick-add-submit-button"
                  disabled={!quickTitle.trim()}
                  aria-label="Tambah Aktiviti"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>

                {onOpenAddModal && (
                  <button
                    type="button"
                    onClick={() => requireAdmin(onOpenAddModal, 'Sila masukkan PIN Admin untuk menambah aktiviti.')}
                    className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Buka Borang Lengkap Aktiviti (Lokasi, Masa, PIC)"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Filters & Search Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua ({totalItems})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('backlog')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'backlog'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Belum Dijadual ({backlogCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('wajib')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'wajib'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🫪 Wajib ({wajibCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('optional')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'optional'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🌿 Pilihan ({optionalCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('scheduled')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'scheduled'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Dijadualkan ({scheduledCount})
              </button>
            </div>

            <div className="relative w-full md:w-auto md:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari aktiviti..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* List of Planned Items */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isWajib = item.priority === 'must_do';
              const isBacklog = !item.dayNumber || item.dayNumber === 0;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    item.isCompleted ? 'bg-slate-50/80 border-slate-200 opacity-75' : isWajib ? 'border-amber-300/80' : 'border-slate-200'
                  }`}
                >
                  {/* Left Column: Checkbox, Title, Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleAgendaComplete(item.id)}
                      className="mt-0.5 text-slate-400 hover:text-teal-600 transition-colors shrink-0 cursor-pointer"
                    >
                      {item.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-bold leading-snug ${
                            item.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>

                        {/* Quick 1-Click Priority Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePriority(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer active:scale-95 ${
                            isWajib
                              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Klik untuk tukar keutamaan (Wajib / Pilihan)"
                        >
                          <span>{isWajib ? '🫪 Wajib' : '🌿 Pilihan'}</span>
                        </button>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                      )}

                      {/* Metadata Chips: Location, PIC */}
                      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-500">
                        {item.locationName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{item.locationName}</span>
                          </span>
                        )}

                        {item.personInCharge && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{item.personInCharge}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Day Assignment, Time Slot, Actions */}
                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Day Assignment Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Tarikh:</span>
                      <select
                        value={item.dayNumber || 0}
                        onChange={(e) => handleAssignDay(item, Number(e.target.value))}
                        className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer ${
                          isBacklog
                            ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            : 'bg-teal-50 text-teal-950 border-teal-300 font-black'
                        }`}
                      >
                        <option value={0}>📋 Belum Dijadualkan</option>
                        {Array.from({ length: duration }).map((_, idx) => {
                          const dNum = idx + 1;
                          const ctx = getDayContextLabel(stay, dNum);
                          const dInfo = getDateForDay(stay.startDate, dNum);
                          return (
                            <option key={dNum} value={dNum}>
                              {ctx.icon} {dInfo.displayLabel} ({dInfo.dayName})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Time Slot Dropdown (if assigned) */}
                    {!isBacklog && (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.timeSlot || 'flexible'}
                          onChange={(e) => handleAssignSlot(item, e.target.value as TimeSlot)}
                          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
                        >
                          <option value="morning">🌅 Pagi</option>
                          <option value="midday">☀️ Tengah Hari</option>
                          <option value="afternoon">🌤️ Petang</option>
                          <option value="evening">🌙 Malam</option>
                          <option value="flexible">🍃 Fleksibel</option>
                        </select>
                      </div>
                    )}

                    {/* Edit & Delete Buttons */}
                    <div className="flex items-center gap-1 ml-1">
                      {onEditItem && (
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title="Edit Maklumat"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Padam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <p className="text-xs font-semibold text-slate-500">
                  {searchQuery ? 'Tiada aktiviti sepadan carian' : 'Belum ada aktiviti'}
                </p>
              </div>
            )}
          </div>

          {/* Susun & Agihkan Agenda Section (Di bahagian bawah sebelum footer) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-50/90 via-slate-50 to-white border border-teal-200/80 rounded-2xl p-3.5 sm:px-4 sm:py-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Susun & Agihkan Agenda
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {backlogCount > 0
                    ? `Agihkan ${backlogCount} aktiviti belum dijadual merentasi ${duration} hari stay`
                    : `Susun dan seimbangkan jadual aktiviti merentasi ${duration} hari`}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="organise-stay-button"
              onClick={handleOrganiseClick}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs shadow-teal-600/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Susun Agenda</span>
            </button>
          </div>
        </>
      )}

      {/* Smart Organiser Modal */}
      <OrganisePlanModal
        isOpen={isOrganiseModalOpen}
        onClose={() => setIsOrganiseModalOpen(false)}
        stay={stay}
        agendaItems={activeAgendaItems}
        onApplyDistribution={batchUpdateAgendaItems}
      />
    </div>
  );
};
