import React, { useState, useMemo } from 'react';
import { Stay, AgendaItem, TimeSlot, ActivityPriority } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG } from '../utils/constants';
import { getDayContextLabel, formatStaySummary } from '../utils/formatters';
import {
  X,
  Sparkles,
  Check,
  ArrowRight,
  RefreshCw,
  Calendar,
  Layers,
  ChevronRight,
  Car,
  Home,
  CheckCircle2,
  Clock,
  MapPin,
  MoveRight
} from 'lucide-react';

interface OrganisePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: Stay;
  agendaItems: AgendaItem[];
  onApplyDistribution: (updates: Array<{ id: string; updates: Partial<AgendaItem> }>) => Promise<void>;
}

export const OrganisePlanModal: React.FC<OrganisePlanModalProps> = ({
  isOpen,
  onClose,
  stay,
  agendaItems,
  onApplyDistribution
}) => {
  const duration = stay.durationDays || 3;
  const stayAgendas = useMemo(() => agendaItems.filter((i) => i.stayId === stay.id), [agendaItems, stay.id]);

  // Working state for the proposal mapping: itemId -> { dayNumber: number, timeSlot: TimeSlot }
  const [proposal, setProposal] = useState<Record<string, { dayNumber: number; timeSlot: TimeSlot }>>({});
  const [isApplying, setIsApplying] = useState(false);

  // Initialize or generate smart distribution
  const generateSmartDistribution = () => {
    const nextProposal: Record<string, { dayNumber: number; timeSlot: TimeSlot }> = {};

    // Get day types info
    const daysMeta = Array.from({ length: duration }).map((_, idx) => {
      const dayNum = idx + 1;
      const ctx = getDayContextLabel(stay, dayNum);
      return {
        dayNum,
        isTravel: ctx.type === 'travel_day',
        label: ctx.label
      };
    });

    const stayDays = daysMeta.filter((d) => !d.isTravel);
    const travelDays = daysMeta.filter((d) => d.isTravel);

    // Group items by priority
    const wajibItems = stayAgendas.filter((i) => i.priority === 'must_do');
    const foodItems = stayAgendas.filter((i) => i.priority === 'food');
    const restItems = stayAgendas.filter((i) => i.priority === 'rest');
    const logisticsItems = stayAgendas.filter((i) => i.priority === 'logistics');
    const optionalItems = stayAgendas.filter((i) => i.priority === 'optional');

    // Slot cycle for natural pacing
    const slotCycle: TimeSlot[] = ['morning', 'midday', 'afternoon', 'evening'];

    // Track slots assigned per day: { dayNum: TimeSlot[] }
    const daySlotUsage: Record<number, TimeSlot[]> = {};
    for (let d = 1; d <= duration; d++) {
      daySlotUsage[d] = [];
    }

    const findBestDayAndSlot = (
      preferredDayTypes: ('stay' | 'travel' | 'any'),
      preferredSlot?: TimeSlot
    ): { dayNum: number; slot: TimeSlot } | null => {
      // Pick target candidate days
      let candidateDays: number[] = [];
      if (preferredDayTypes === 'stay') {
        candidateDays = stayDays.length > 0 ? stayDays.map((d) => d.dayNum) : daysMeta.map((d) => d.dayNum);
      } else if (preferredDayTypes === 'travel') {
        candidateDays = travelDays.length > 0 ? travelDays.map((d) => d.dayNum) : daysMeta.map((d) => d.dayNum);
      } else {
        candidateDays = daysMeta.map((d) => d.dayNum);
      }

      // Sort candidate days by least number of activities
      candidateDays.sort((a, b) => daySlotUsage[a].length - daySlotUsage[b].length);

      for (const dayNum of candidateDays) {
        const usedSlots = daySlotUsage[dayNum];
        // If preferredSlot is available on this day
        if (preferredSlot && !usedSlots.includes(preferredSlot)) {
          return { dayNum, slot: preferredSlot };
        }
        // Otherwise pick the next available slot in cycle
        for (const slot of slotCycle) {
          if (!usedSlots.includes(slot)) {
            return { dayNum, slot };
          }
        }
      }

      // If all preferred slots full, fallback to flexible/afternoon on day with least items
      const fallbackDay = candidateDays[0] || 1;
      return { dayNum: fallbackDay, slot: preferredSlot || 'afternoon' };
    };

    // 1. Assign Logistics (e.g. travel, check-in, unpack) to Travel Days if available
    for (const item of logisticsItems) {
      const match = findBestDayAndSlot('travel', item.timeSlot !== 'flexible' ? item.timeSlot : 'morning');
      if (match) {
        nextProposal[item.id] = { dayNumber: match.dayNum, timeSlot: match.slot };
        daySlotUsage[match.dayNum].push(match.slot);
      }
    }

    // 2. Assign Wajib Items (High Priority) to Stay Days (or earliest available)
    for (const item of wajibItems) {
      const naturalSlot = item.timeSlot !== 'flexible' ? item.timeSlot : undefined;
      const match = findBestDayAndSlot('stay', naturalSlot);
      if (match) {
        nextProposal[item.id] = { dayNumber: match.dayNum, timeSlot: match.slot };
        daySlotUsage[match.dayNum].push(match.slot);
      }
    }

    // 3. Assign Food Items (breakfast/lunch/dinner)
    for (const item of foodItems) {
      const naturalSlot =
        item.title.toLowerCase().includes('sarapan') || item.title.toLowerCase().includes('nasi dagang')
          ? 'morning'
          : item.title.toLowerCase().includes('tengahari')
          ? 'midday'
          : item.title.toLowerCase().includes('malam')
          ? 'evening'
          : item.timeSlot !== 'flexible'
          ? item.timeSlot
          : 'midday';

      const match = findBestDayAndSlot('any', naturalSlot);
      if (match) {
        nextProposal[item.id] = { dayNumber: match.dayNum, timeSlot: match.slot };
        daySlotUsage[match.dayNum].push(match.slot);
      }
    }

    // 4. Assign Rest Items (afternoon / evening)
    for (const item of restItems) {
      const match = findBestDayAndSlot('any', 'afternoon');
      if (match) {
        nextProposal[item.id] = { dayNumber: match.dayNum, timeSlot: match.slot };
        daySlotUsage[match.dayNum].push(match.slot);
      }
    }

    // 5. Assign Optional Items (spread out, but keep 20-30% in backlog if total is high so user isn't exhausted)
    const maxItemsTotal = duration * 4; // Cap at ~3-4 per day max for realistic pacing
    let assignedCount = Object.keys(nextProposal).length;

    for (const item of optionalItems) {
      if (assignedCount < maxItemsTotal) {
        const match = findBestDayAndSlot('stay', item.timeSlot !== 'flexible' ? item.timeSlot : undefined);
        if (match) {
          nextProposal[item.id] = { dayNumber: match.dayNum, timeSlot: match.slot };
          daySlotUsage[match.dayNum].push(match.slot);
          assignedCount++;
        }
      } else {
        // Keep in Unscheduled backlog (dayNumber = 0)
        nextProposal[item.id] = { dayNumber: 0, timeSlot: item.timeSlot || 'flexible' };
      }
    }

    // Catch any remaining items
    for (const item of stayAgendas) {
      if (!nextProposal[item.id]) {
        nextProposal[item.id] = {
          dayNumber: item.dayNumber || 0,
          timeSlot: item.timeSlot || 'morning'
        };
      }
    }

    setProposal(nextProposal);
  };

  // On open, populate with current state or auto-generate if all unassigned
  React.useEffect(() => {
    if (isOpen) {
      const currentMap: Record<string, { dayNumber: number; timeSlot: TimeSlot }> = {};
      let hasAnyScheduled = false;

      stayAgendas.forEach((item) => {
        currentMap[item.id] = {
          dayNumber: item.dayNumber || 0,
          timeSlot: item.timeSlot || 'morning'
        };
        if (item.dayNumber > 0) hasAnyScheduled = true;
      });

      if (!hasAnyScheduled && stayAgendas.length > 0) {
        generateSmartDistribution();
      } else {
        setProposal(currentMap);
      }
    }
  }, [isOpen, stayAgendas]);

  if (!isOpen) return null;

  const totalPlanned = stayAgendas.length;
  const wajibCount = stayAgendas.filter((i) => i.priority === 'must_do').length;
  const optionalCount = totalPlanned - wajibCount;

  // Handle individual item day/slot change in proposal
  const handleItemMove = (itemId: string, targetDay: number, targetSlot?: TimeSlot) => {
    setProposal((prev) => ({
      ...prev,
      [itemId]: {
        dayNumber: targetDay,
        timeSlot: targetSlot || prev[itemId]?.timeSlot || 'morning'
      }
    }));
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const updatesList: Array<{ id: string; updates: Partial<AgendaItem> }> = Object.entries(proposal).map(
        ([id, val]: [string, { dayNumber: number; timeSlot: TimeSlot }]) => ({
          id,
          updates: {
            dayNumber: val.dayNumber,
            timeSlot: val.timeSlot
          }
        })
      );

      await onApplyDistribution(updatesList);
      onClose();
    } catch (err) {
      console.error('Failed applying distribution:', err);
    } finally {
      setIsApplying(false);
    }
  };

  // Group items by proposed day
  const getItemsForDay = (dayNum: number) => {
    return stayAgendas.filter((item) => {
      const p = proposal[item.id];
      if (p) return p.dayNumber === dayNum;
      return (item.dayNumber || 0) === dayNum;
    });
  };

  const backlogItems = getItemsForDay(0);

  return (
    <div
      id="organise-plan-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="organise-plan-modal-container"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-stone-200 bg-stone-50/90 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                Susun & Agihkan Agenda Stay
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Agihkan senarai perkara dirancang merentasi hari stay secara seimbang tanpa membebankan jadual.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary & Smart Re-generate Bar */}
        <div className="px-6 py-3.5 bg-amber-50/80 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-stone-700 font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-bold">
              📝 {totalPlanned} Perkara Dirancang
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900">
              ⭐ {wajibCount} Wajib
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-emerald-900">
              🌿 {optionalCount} Pilihan
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700">
              🏠 {duration} Hari Aktiviti
            </span>
          </div>

          <button
            type="button"
            onClick={generateSmartDistribution}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-2xs text-xs active:scale-98 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cadangkan Agihan Automatik</span>
          </button>
        </div>

        {/* Multi-Column Day Distribution Interactive Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Stay Days Columns */}
            {Array.from({ length: duration }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayContext = getDayContextLabel(stay, dayNum);
              const isTravel = dayContext.type === 'travel_day';
              const itemsInDay = getItemsForDay(dayNum);
              const dayWajibCount = itemsInDay.filter((i) => i.priority === 'must_do').length;

              return (
                <div
                  key={dayNum}
                  className={`rounded-2xl border flex flex-col overflow-hidden shadow-2xs ${
                    isTravel ? 'bg-orange-50/30 border-orange-200' : 'bg-stone-50/50 border-stone-200'
                  }`}
                >
                  {/* Column Day Header */}
                  <div
                    className={`p-3.5 border-b flex items-center justify-between ${
                      isTravel ? 'bg-orange-100/70 border-orange-200 text-orange-950' : 'bg-stone-100/90 border-stone-200 text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{dayContext.icon}</span>
                      <div>
                        <h4 className="text-xs font-black">{dayContext.label}</h4>
                        <p className="text-[10px] text-stone-500">
                          {isTravel ? 'Hari Perjalanan' : 'Hari Stay Utama'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border border-stone-300/60">
                      {itemsInDay.length} aktiviti
                    </span>
                  </div>

                  {/* Day Activities List */}
                  <div className="p-3 space-y-2.5 flex-1 min-h-[160px]">
                    {itemsInDay.map((item) => {
                      const p = proposal[item.id] || { dayNumber: item.dayNumber, timeSlot: item.timeSlot };
                      const slotMeta = TIME_SLOTS[p.timeSlot] || TIME_SLOTS.morning;
                      const isWajib = item.priority === 'must_do';

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border bg-white shadow-2xs space-y-1.5 transition-all text-xs ${
                            isWajib ? 'border-amber-300' : 'border-stone-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="font-bold text-stone-900 leading-snug line-clamp-2">
                              {item.title}
                            </span>
                            <span
                              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                isWajib ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {isWajib ? '⭐ Wajib' : '🌿 Pilihan'}
                            </span>
                          </div>

                          {/* Slot & Move Controls */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                            {/* Time slot picker */}
                            <select
                              value={p.timeSlot}
                              onChange={(e) => handleItemMove(item.id, dayNum, e.target.value as TimeSlot)}
                              className="text-[11px] font-semibold bg-stone-50 border border-stone-200 rounded-md px-1.5 py-0.5 text-stone-700 focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="morning">🌅 Pagi</option>
                              <option value="midday">☀️ Tengah Hari</option>
                              <option value="afternoon">🌤️ Petang</option>
                              <option value="evening">🌙 Malam</option>
                              <option value="flexible">🍃 Fleksibel</option>
                            </select>

                            {/* Move to another day dropdown */}
                            <select
                              value={dayNum}
                              onChange={(e) => handleItemMove(item.id, Number(e.target.value))}
                              className="text-[11px] font-semibold bg-amber-50/80 text-amber-900 border border-amber-200 rounded-md px-1.5 py-0.5"
                            >
                              {Array.from({ length: duration }).map((_, dIdx) => (
                                <option key={dIdx + 1} value={dIdx + 1}>
                                  Hari {dIdx + 1}
                                </option>
                              ))}
                              <option value={0}>📋 Belum Dijadualkan</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}

                    {itemsInDay.length === 0 && (
                      <div className="h-full flex items-center justify-center p-4 border border-dashed border-stone-200 rounded-xl text-center">
                        <span className="text-[11px] text-stone-400 font-medium">
                          Tiada aktiviti dijadualkan
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Backlog Column: 📋 Belum Dijadualkan */}
            <div className="rounded-2xl border border-stone-300 bg-stone-100/60 flex flex-col overflow-hidden shadow-2xs">
              <div className="p-3.5 border-b border-stone-200 bg-stone-200/80 text-stone-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <h4 className="text-xs font-black">Belum Dijadualkan</h4>
                    <p className="text-[10px] text-stone-500">Pilihan santai / simpanan</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border border-stone-300">
                  {backlogItems.length}
                </span>
              </div>

              <div className="p-3 space-y-2.5 flex-1 min-h-[160px]">
                {backlogItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-bold text-stone-800 line-clamp-2">{item.title}</span>
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-stone-100 text-stone-600">
                        {item.priority === 'must_do' ? '⭐ Wajib' : '🌿 Pilihan'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                      <span className="text-[10px] text-stone-400">Jadualkan ke:</span>
                      <select
                        value={0}
                        onChange={(e) => handleItemMove(item.id, Number(e.target.value))}
                        className="text-[11px] font-bold bg-amber-600 text-white rounded-md px-2 py-0.5 hover:bg-amber-700"
                      >
                        <option value={0}>Belum Dijadualkan</option>
                        {Array.from({ length: duration }).map((_, dIdx) => (
                          <option key={dIdx + 1} value={dIdx + 1}>
                            Hari {dIdx + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {backlogItems.length === 0 && (
                  <div className="h-full flex items-center justify-center p-4 border border-dashed border-stone-200 rounded-xl text-center">
                    <span className="text-[11px] text-stone-400 font-medium">
                      Semua perkara telah diagihkan ke dalam hari stay!
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-stone-500 text-center sm:text-left">
            💡 Anda sentiasa boleh memindah, menukar waktu, atau membiarkan aktiviti dalam senarai Belum Dijadualkan kemudian.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-stone-700 bg-stone-200/80 hover:bg-stone-300 rounded-xl transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={isApplying}
              onClick={handleApply}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 active:scale-98 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isApplying ? 'Menyimpan...' : 'Gunakan Susunan Ini'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
