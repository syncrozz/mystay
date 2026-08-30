import React, { useState } from 'react';
import { AgendaItem, TimeSlot, ActivityPriority, Stay } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG } from '../utils/constants';
import { getDayContextLabel } from '../utils/formatters';
import { useStay } from '../context/StayContext';
import {
  Plus,
  Check,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  User,
  Star,
  Palmtree,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Layers,
  HelpCircle
} from 'lucide-react';
import { PacingAdviceCard } from './PacingAdviceCard';
import { OrganisePlanModal } from './OrganisePlanModal';

interface AgendaBoardProps {
  stay: Stay;
  agendaItems: AgendaItem[];
  initialSelectedDay?: number;
  onAddItem: (dayNumber: number, slot: TimeSlot) => void;
  onEditItem: (item: AgendaItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onNavigateToPlan?: () => void;
}

export const AgendaBoard: React.FC<AgendaBoardProps> = ({
  stay,
  agendaItems,
  initialSelectedDay = 1,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleComplete,
  onNavigateToPlan
}) => {
  const { updateAgendaItem, batchUpdateAgendaItems, addAgendaItem } = useStay();
  const [selectedDay, setSelectedDay] = useState<number>(initialSelectedDay);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isOrganiseModalOpen, setIsOrganiseModalOpen] = useState(false);
  const [showBacklogTray, setShowBacklogTray] = useState(true);

  const daysCount = stay.durationDays || 3;

  // Unscheduled Backlog items (dayNumber === 0 or undefined)
  const backlogItems = agendaItems.filter((item) => !item.dayNumber || item.dayNumber === 0);

  // Items for selected day (or all scheduled items if selectedDay === 0)
  const filteredAgendas = agendaItems.filter((item) => {
    // If selectedDay is 0 (all days), show only scheduled items (dayNumber > 0)
    if (selectedDay === 0) {
      if (!item.dayNumber || item.dayNumber === 0) return false;
    } else {
      if (item.dayNumber !== selectedDay) return false;
    }

    if (priorityFilter === 'all') return true;
    if (priorityFilter === 'incomplete') return !item.isCompleted;
    if (priorityFilter === 'must_do') return item.priority === 'must_do';
    if (priorityFilter === 'optional') return item.priority !== 'must_do';
    return item.priority === priorityFilter;
  });

  const activeDayContext = selectedDay > 0 ? getDayContextLabel(stay, selectedDay) : null;

  // Core 4 time-of-day blocks
  const hasFlexibleItems = filteredAgendas.some((i) => i.timeSlot === 'flexible');
  const slotKeys: TimeSlot[] = hasFlexibleItems
    ? ['morning', 'midday', 'afternoon', 'evening', 'flexible']
    : ['morning', 'midday', 'afternoon', 'evening'];

  // Quick move item to day
  const handleMoveDay = async (item: AgendaItem, targetDay: number) => {
    await updateAgendaItem(item.id, { dayNumber: targetDay });
  };

  // Quick 1-click schedule from backlog into currently selected day
  const handleScheduleFromBacklog = async (item: AgendaItem, targetSlot: TimeSlot = 'morning') => {
    const targetDay = selectedDay === 0 ? 1 : selectedDay;
    await updateAgendaItem(item.id, {
      dayNumber: targetDay,
      timeSlot: targetSlot
    });
  };

  // Quick 1-click toggle priority
  const handleTogglePriority = async (item: AgendaItem) => {
    const nextPriority: ActivityPriority = item.priority === 'must_do' ? 'optional' : 'must_do';
    await updateAgendaItem(item.id, { priority: nextPriority });
  };

  return (
    <div id="agenda-board" className="space-y-6">
      
      {/* 1. Unscheduled Backlog Tray (if any items exist) */}
      {backlogItems.length > 0 && (
        <div className="bg-amber-50/90 rounded-2xl border border-amber-200 p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500 text-white text-xs">📋</span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-950">
                  Belum Dijadualkan ({backlogItems.length})
                </h3>
                <p className="text-[11px] text-amber-800">
                  Tarik atau klik &quot;+ Jadualkan&quot; untuk masukkan aktiviti ke dalam Hari {selectedDay === 0 ? 1 : selectedDay}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOrganiseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Susun Automatik</span>
              </button>

              {onNavigateToPlan && (
                <button
                  type="button"
                  onClick={onNavigateToPlan}
                  className="px-2.5 py-1.5 bg-white hover:bg-teal-50 border border-teal-300 text-teal-950 rounded-xl text-xs font-semibold transition-colors"
                >
                  Urus Perancangan
                </button>
              )}
            </div>
          </div>

          {/* Horizontal list of backlog chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {backlogItems.map((bItem) => {
              const isWajib = bItem.priority === 'must_do';
              return (
                <div
                  key={bItem.id}
                  className="bg-white border border-teal-200/90 rounded-xl p-2.5 shadow-2xs flex items-center justify-between gap-3 text-xs min-w-[220px] max-w-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs">{isWajib ? '⭐' : '🌿'}</span>
                    <span className="font-bold text-slate-900 truncate">{bItem.title}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleScheduleFromBacklog(bItem)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                    title={`Masukkan ke Hari ${selectedDay === 0 ? 1 : selectedDay}`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Hari {selectedDay === 0 ? 1 : selectedDay}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Day Selector Pills & Controls */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
              Hari:
            </span>
            {Array.from({ length: daysCount }).map((_, idx) => {
              const dayNum = idx + 1;
              const isSelected = selectedDay === dayNum;
              const dayContext = getDayContextLabel(stay, dayNum);
              const isTravel = dayContext.type === 'travel_day';
              const dayItems = agendaItems.filter((i) => i.dayNumber === dayNum);
              const mustCount = dayItems.filter((i) => i.priority === 'must_do').length;

              return (
                <button
                  key={dayNum}
                  type="button"
                  id={`day-tab-${dayNum}`}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? isTravel
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : isTravel
                      ? 'bg-sky-50/80 hover:bg-sky-100 text-sky-950 border-sky-200'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{dayContext.icon}</span>
                  <span>{dayContext.label}</span>
                  {mustCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isSelected
                          ? 'bg-black/20 text-white'
                          : isTravel
                          ? 'bg-sky-200 text-sky-950'
                          : 'bg-teal-200 text-teal-950'
                      }`}
                    >
                      ⭐ {mustCount}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedDay(0)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                selectedDay === 0
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Semua Hari ({agendaItems.filter((i) => (i.dayNumber || 0) > 0).length})
            </button>
          </div>

          {/* Priority Filter & Susun Button */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Semua Keutamaan</option>
                <option value="must_do">Wajib</option>
                <option value="optional">Santai</option>
                <option value="food">Makan</option>
                <option value="rest">Rehat</option>
                <option value="logistics">Perjalanan</option>
                <option value="incomplete">Belum Selesai</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsOrganiseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Susun</span>
            </button>
          </div>
        </div>

        {/* Selected Day Context Banner */}
        {activeDayContext && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              activeDayContext.type === 'travel_day'
                ? 'bg-sky-50/80 border-sky-200 text-sky-950'
                : 'bg-teal-50/80 border-teal-200 text-teal-950'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{activeDayContext.type === 'travel_day' ? '🚗' : '🏠'}</span>
              <div>
                <span className="font-extrabold">{activeDayContext.label}:</span>{' '}
                <span className="text-slate-600">
                  {activeDayContext.type === 'travel_day'
                    ? 'Hari perjalanan (bertolak / pulang). Fokuskan perancangan kepada waktu perjalanan, persinggahan R&R, dan logistik santai.'
                    : 'Hari penginapan penuh. Waktu terbaik untuk agenda lawatan penting, kenduri, ziarah, makan santai & masa bersama.'}
                </span>
              </div>
            </div>

            <span className="shrink-0 font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
              {filteredAgendas.length} aktiviti
            </span>
          </div>
        )}
      </div>

      {/* 3. Pacing Advice Card */}
      <PacingAdviceCard
        agendaItems={agendaItems}
        selectedDay={selectedDay}
        totalDays={stay.durationDays}
      />

      {/* 4. Time Slots Grid */}
      <div className="space-y-6">
        {slotKeys.map((slotKey) => {
          const slotMeta = TIME_SLOTS[slotKey];
          const slotItems = filteredAgendas.filter((i) => i.timeSlot === slotKey);

          return (
            <div
              key={slotKey}
              id={`slot-section-${slotKey}`}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-slate-50/90 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{slotMeta.icon}</span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{slotMeta.label}</h3>
                    <span className="text-xs font-semibold text-slate-400">
                      ({slotItems.length})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddItem(selectedDay === 0 ? 1 : selectedDay, slotKey)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-950 bg-teal-100/80 hover:bg-teal-200 rounded-xl transition-all active:scale-98 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Aktiviti</span>
                </button>
              </div>

              {/* Slot Items */}
              <div className="p-4 space-y-3">
                {slotItems.map((item) => {
                  const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.optional;
                  const isWajib = item.priority === 'must_do';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isWajib ? 'border-l-4 border-l-teal-600 border-teal-200' : 'border-slate-200'
                      } ${
                        item.isCompleted
                          ? 'bg-slate-50/70 opacity-75'
                          : 'bg-white hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox and Content */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleComplete(item.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                              item.isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white hover:border-teal-500'
                            }`}
                            title={item.isCompleted ? 'Tanda belum selesai' : 'Tanda selesai'}
                          >
                            {item.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Title & Specific Time Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`text-sm sm:text-base font-bold leading-snug ${
                                  item.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {item.title}
                              </h4>

                              {/* Specific Time */}
                              {item.timeSpecific && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-950 bg-teal-100/70 border border-teal-200/80 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-teal-700" />
                                  {item.timeSpecific}
                                </span>
                              )}
                            </div>

                            {/* Secondary Metadata Chips & Priority Toggle */}
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {/* Day badge if in all days view */}
                              {selectedDay === 0 && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                  Hari {item.dayNumber}
                                </span>
                              )}

                              {/* 1-Click Priority Toggle Button */}
                              <button
                                type="button"
                                onClick={() => handleTogglePriority(item)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] rounded-md border font-extrabold transition-all cursor-pointer active:scale-95 ${
                                  isWajib
                                    ? 'bg-teal-100 text-teal-950 border-teal-300 hover:bg-teal-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title="Klik untuk tukar keutamaan (Wajib / Pilihan)"
                              >
                                <span>{isWajib ? '⭐ Wajib' : '🌿 Pilihan'}</span>
                              </button>

                              {/* Location */}
                              {item.locationName && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {item.locationName}
                                </span>
                              )}

                              {/* PIC */}
                              {item.personInCharge && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-950 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                                  <User className="w-3 h-3 text-teal-600" />
                                  PIC: {item.personInCharge}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {item.description && (
                              <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Day Switcher & Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Move to another day dropdown */}
                          <select
                            value={item.dayNumber}
                            onChange={(e) => handleMoveDay(item, Number(e.target.value))}
                            className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Tukar hari atau kembalikan ke Belum Dijadualkan"
                          >
                            {Array.from({ length: daysCount }).map((_, dIdx) => (
                              <option key={dIdx + 1} value={dIdx + 1}>
                                Hari {dIdx + 1}
                              </option>
                            ))}
                            <option value={0}>📋 Belum Dijadualkan</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit aktiviti"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Padam aktiviti"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {slotItems.length === 0 && (
                  <div
                    onClick={() => onAddItem(selectedDay === 0 ? 1 : selectedDay, slotKey)}
                    className="p-4 rounded-xl border border-dashed border-slate-200 hover:border-teal-400 text-center cursor-pointer group transition-colors"
                  >
                    <p className="text-xs text-slate-400 group-hover:text-teal-700 font-medium">
                      + Tiada aktiviti dalam slot {slotMeta.label.toLowerCase()}. Tekan untuk tambah jika perlu.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Smart Organiser Modal */}
      <OrganisePlanModal
        isOpen={isOrganiseModalOpen}
        onClose={() => setIsOrganiseModalOpen(false)}
        stay={stay}
        agendaItems={agendaItems}
        onApplyDistribution={batchUpdateAgendaItems}
      />
    </div>
  );
};
