import React, { useState, useMemo } from 'react';
import { Stay, AgendaItem, TimeSlot, ActivityPriority } from '../types';
import { useStay } from '../context/StayContext';
import { PRIORITY_CONFIG, TIME_SLOTS } from '../utils/constants';
import { getDayContextLabel, toTitleCase } from '../utils/formatters';
import { OrganisePlanModal } from './OrganisePlanModal';
import {
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Calendar,
  Layers,
  Star,
  Palmtree,
  Car,
  Home,
  Trash2,
  Edit2,
  Filter,
  Search,
  ArrowUpDown,
  Compass,
  Lightbulb,
  Check,
  Clock,
  MapPin,
  User,
  ChevronDown,
  Loader2
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

  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<ActivityPriority>('must_do');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrganiseModalOpen, setIsOrganiseModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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
  const completedCount = items.filter((i) => i.isCompleted).length;

  // Handle Frictionless Quick Add
  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = quickTitle.trim();
    if (!clean) return;

    setQuickTitle('');
    setIsAdding(true);
    try {
      await addAgendaItem({
        stayId: stay.id,
        title: toTitleCase(clean),
        dayNumber: 0, // 0 = Belum dijadualkan / Backlog Pool
        timeSlot: 'flexible',
        priority: quickPriority,
        isCompleted: false,
        locationName: '',
        personInCharge: '',
        description: '',
        notes: ''
      });
    } catch (err) {
      console.error('Failed adding plan item:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Add idea directly from quick Malaysian stay ideas chip
  const handleAddIdeaChip = async (idea: { title: string; priority: ActivityPriority }) => {
    // If exact item already exists, highlight, otherwise add
    const exists = items.some((i) => i.title.toLowerCase() === idea.title.toLowerCase());
    if (exists) {
      setQuickTitle(idea.title);
      return;
    }

    try {
      await addAgendaItem({
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
      });
    } catch (err) {
      console.error('Failed adding idea:', err);
    }
  };

  // Toggle priority between Wajib (must_do) and Pilihan (optional)
  const handleTogglePriority = async (item: AgendaItem) => {
    const nextPriority: ActivityPriority = item.priority === 'must_do' ? 'optional' : 'must_do';
    await updateAgendaItem(item.id, { priority: nextPriority });
  };

  // Quick assign day
  const handleAssignDay = async (item: AgendaItem, targetDay: number) => {
    await updateAgendaItem(item.id, { dayNumber: targetDay });
  };

  // Quick change time slot
  const handleAssignSlot = async (item: AgendaItem, targetSlot: TimeSlot) => {
    await updateAgendaItem(item.id, { timeSlot: targetSlot });
  };

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter tab
      if (activeFilter === 'backlog' && (item.dayNumber || 0) !== 0) return false;
      if (activeFilter === 'scheduled' && (item.dayNumber || 0) === 0) return false;
      if (activeFilter === 'wajib' && item.priority !== 'must_do') return false;
      if (activeFilter === 'optional' && item.priority === 'must_do') return false;

      // Search query
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
    <div id="plan-board-view" className="space-y-6 max-w-6xl mx-auto">
      
      {/* 1. Header & Planning Context Status Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
              <span>📋 Langkah 1: Kumpul Perkara Dirancang</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Perancangan Aktiviti
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl">
              Senaraikan semua perkara yang ingin anda buat sepanjang stay ini. Jangan risau tentang memilih tarikh atau waktu dahulu—kumpulkan segalanya di sini, kemudian susun ke dalam hari aktiviti dengan mudah.
            </p>
          </div>

          {/* Call to Action: Susun Agenda */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              id="organise-stay-button"
              onClick={() => setIsOrganiseModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-sm font-black rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Susun Agenda Stay</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 block uppercase tracking-wider">
              Total Dirancang
            </span>
            <div className="text-xl font-black text-stone-900 mt-0.5 flex items-baseline gap-1.5">
              <span>{totalItems}</span>
              <span className="text-xs font-semibold text-stone-400">perkara</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
            <span className="text-[11px] font-bold text-amber-800 block uppercase tracking-wider">
              ⭐ Keutamaan Wajib
            </span>
            <div className="text-xl font-black text-amber-950 mt-0.5 flex items-baseline gap-1.5">
              <span>{wajibCount}</span>
              <span className="text-xs font-semibold text-amber-700">mesti buat</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wider">
              🌿 Pilihan Santai
            </span>
            <div className="text-xl font-black text-emerald-950 mt-0.5 flex items-baseline gap-1.5">
              <span>{optionalCount}</span>
              <span className="text-xs font-semibold text-emerald-700">fleksibel</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-100/70 border border-stone-200">
            <span className="text-[11px] font-bold text-stone-600 block uppercase tracking-wider">
              📋 Belum Dijadualkan
            </span>
            <div className="text-xl font-black text-stone-800 mt-0.5 flex items-baseline gap-1.5">
              <span>{backlogCount}</span>
              <span className="text-xs font-semibold text-stone-500">belum dijadualkan</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Fast Frictionless Brain Dump Input Area */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="quick-brain-dump-input" className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <span>✨ Tambah Cepat Perkara Dirancang</span>
          </label>
          <span className="text-[11px] text-stone-400">Tekan Enter atau klik Tambah</span>
        </div>

        <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-stretch gap-2.5">
          {/* Text Input */}
          <div className="relative flex-1">
            <input
              id="quick-brain-dump-input"
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(toTitleCase(e.target.value))}
              placeholder="Cth: Makan Nasi Dagang, Pergi Pantai, Gi Kenduri Ayoh Lie, Ziarah Tok..."
              className="w-full pl-4 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder:text-stone-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Priority Toggle Buttons */}
          <div className="inline-flex rounded-2xl bg-stone-100 p-1 border border-stone-200 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setQuickPriority('must_do')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickPriority === 'must_do'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ⭐ Wajib
            </button>
            <button
              type="button"
              onClick={() => setQuickPriority('optional')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickPriority === 'optional'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🌿 Santai
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="quick-add-submit-button"
            disabled={!quickTitle.trim() || isAdding}
            aria-label="Tambah Aktiviti"
            className="px-5 py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 text-white text-xs font-black rounded-2xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Menambah...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Malaysian Short Stay Suggestions Chips */}
        <div className="pt-2">
          <span className="text-[11px] font-bold text-stone-400 block mb-2">
            💡 Cadangan Pantas (Klik Untuk Tambah Serta-Merta):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {MALAYSIAN_STAY_IDEAS.map((idea, idx) => {
              const isAdded = items.some((i) => i.title.toLowerCase() === idea.title.toLowerCase());
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddIdeaChip(idea)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer active:scale-95 ${
                    isAdded
                      ? 'bg-amber-50 border-amber-200 text-amber-900 opacity-80'
                      : 'bg-stone-50 hover:bg-white hover:border-amber-300 border-stone-200 text-stone-700 shadow-2xs'
                  }`}
                >
                  <span>{idea.icon}</span>
                  <span>{idea.title}</span>
                  {isAdded && <Check className="w-3 h-3 text-amber-700" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Filters, Search & View Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            Semua ({totalItems})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('backlog')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'backlog'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            📋 Belum Dijadualkan ({backlogCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('wajib')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'wajib'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            ⭐ Wajib ({wajibCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('optional')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'optional'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            🌿 Pilihan ({optionalCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('scheduled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'scheduled'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            📅 Sudah Dijadualkan ({scheduledCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktiviti dirancang..."
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* 4. List of Planned Items */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isWajib = item.priority === 'must_do';
          const isBacklog = !item.dayNumber || item.dayNumber === 0;
          const dayContext = !isBacklog ? getDayContextLabel(stay, item.dayNumber) : null;
          const slotMeta = TIME_SLOTS[item.timeSlot] || TIME_SLOTS.flexible;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.isCompleted ? 'bg-stone-50/80 border-stone-200 opacity-75' : isWajib ? 'border-amber-300' : 'border-stone-200'
              }`}
            >
              {/* Left Column: Checkbox, Title, Details */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleAgendaComplete(item.id)}
                  className="mt-0.5 text-stone-400 hover:text-amber-600 transition-colors shrink-0 cursor-pointer"
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
                        item.isCompleted ? 'line-through text-stone-400' : 'text-stone-900'
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
                      <span>{isWajib ? '⭐ Wajib' : '🌿 Pilihan'}</span>
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-xs text-stone-500 line-clamp-1">{item.description}</p>
                  )}

                  {/* Metadata Chips: Location, PIC */}
                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-stone-500">
                    {item.locationName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{item.locationName}</span>
                      </span>
                    )}

                    {item.personInCharge && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-stone-400" />
                        <span>{item.personInCharge}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Day Assignment, Time Slot, Actions */}
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                {/* Day Assignment Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 font-medium">Hari:</span>
                  <select
                    value={item.dayNumber || 0}
                    onChange={(e) => handleAssignDay(item, Number(e.target.value))}
                    className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer ${
                      isBacklog
                        ? 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                        : 'bg-amber-50 text-amber-950 border-amber-300 font-black'
                    }`}
                  >
                    <option value={0}>📋 Belum Dijadualkan</option>
                    {Array.from({ length: duration }).map((_, idx) => {
                      const dNum = idx + 1;
                      const ctx = getDayContextLabel(stay, dNum);
                      return (
                        <option key={dNum} value={dNum}>
                          {ctx.icon} {ctx.label}
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
                      className="text-xs font-semibold bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-700"
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
                      onClick={() => onEditItem(item)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                      title="Edit Maklumat"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteAgendaItem(item.id)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 shadow-2xs space-y-3">
            <span className="text-3xl block">📝</span>
            <h4 className="text-sm font-black text-stone-800">
              {searchQuery ? 'Tiada aktiviti sepadan carian' : 'Belum ada perkara dirancang'}
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Gunakan kotak input di atas untuk memasukkan perkara yang ingin anda buat, atau pilih salah satu cadangan pantas!
            </p>
          </div>
        )}
      </div>

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
