import React, { useState } from 'react';
import { Stay, AgendaItem, TimeSlot, DayType } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG, DAY_TYPE_CONFIG } from '../utils/constants';
import { getDayType, getDayContextLabel, formatStaySummary } from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  Plus,
  Check,
  MapPin,
  Clock,
  User,
  ChevronRight,
  Sparkles,
  X,
  List,
  ChevronLeft,
  Car,
  Home
} from 'lucide-react';

interface CalendarViewProps {
  stay: Stay;
  agendaItems: AgendaItem[];
  onAddItem: (dayNumber: number, slot: TimeSlot) => void;
  onEditItem: (item: AgendaItem) => void;
  onToggleComplete: (id: string) => void;
  onNavigateToPlan?: () => void;
  onSelectDayInAgenda?: (dayNumber: number) => void;
}

export function CalendarView({
  stay,
  agendaItems,
  onAddItem,
  onEditItem,
  onToggleComplete,
  onNavigateToPlan
}: CalendarViewProps) {
  // Modal/Drawer state for Full Day Detail
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(null);

  const duration = stay.durationDays || 3;
  const stayAgendas = agendaItems.filter((item) => item.stayId === stay.id);
  const backlogItems = stayAgendas.filter((item) => !item.dayNumber || item.dayNumber === 0);
  const staySummary = formatStaySummary(stay);

  // Helper to compute date for day index (1-based)
  const getDayDateInfo = (dayIndex: number) => {
    if (!stay.startDate) {
      return {
        dayNumber: dayIndex,
        dateFormatted: `Hari ${dayIndex}`,
        dayName: `Hari ${dayIndex}`,
        dayOfMonth: `${dayIndex}`,
        monthShort: ''
      };
    }

    try {
      const start = new Date(stay.startDate);
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + (dayIndex - 1));

      const dayName = targetDate.toLocaleDateString('ms-MY', { weekday: 'short' });
      const dayOfMonth = targetDate.getDate().toString();
      const monthShort = targetDate.toLocaleDateString('ms-MY', { month: 'short' });
      const dateFormatted = targetDate.toLocaleDateString('ms-MY', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
      });

      return {
        dayNumber: dayIndex,
        dateFormatted,
        dayName,
        dayOfMonth,
        monthShort
      };
    } catch {
      return {
        dayNumber: dayIndex,
        dateFormatted: `Hari ${dayIndex}`,
        dayName: `Hari ${dayIndex}`,
        dayOfMonth: `${dayIndex}`,
        monthShort: ''
      };
    }
  };

  // Sort items for a day: morning -> midday -> afternoon -> evening -> flexible
  const getSortedDayItems = (dayNum: number) => {
    const slotRank: Record<TimeSlot, number> = {
      morning: 1,
      midday: 2,
      afternoon: 3,
      evening: 4,
      flexible: 5
    };
    return stayAgendas
      .filter((item) => item.dayNumber === dayNum)
      .sort((a, b) => slotRank[a.timeSlot] - slotRank[b.timeSlot]);
  };

  const activeDayDetailItems = selectedDayDetail !== null ? getSortedDayItems(selectedDayDetail) : [];
  const activeDayDateInfo = selectedDayDetail !== null ? getDayDateInfo(selectedDayDetail) : null;
  const activeDayContext = selectedDayDetail !== null ? getDayContextLabel(stay, selectedDayDetail) : null;

  return (
    <div id="stay-calendar-view" className="space-y-6">
      
      {/* Calendar Header / Subtitle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-800">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">
                Gambaran Keseluruhan Kalendar Stay
              </h3>
              <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md hidden sm:inline-block">
                {staySummary}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Gambaran aktiviti harian dengan pembezaan Hari Perjalanan (🚗) dan Hari Stay (🏠).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {backlogItems.length > 0 && onNavigateToPlan && (
            <button
              type="button"
              onClick={onNavigateToPlan}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all cursor-pointer"
            >
              <span>📋 Belum Dijadualkan ({backlogItems.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onAddItem(1, 'morning')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-2xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Agenda</span>
          </button>
        </div>
      </div>

      {/* Backlog Alert banner if items exist */}
      {backlogItems.length > 0 && onNavigateToPlan && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-950">
            <span className="text-base">📋</span>
            <span>
              Anda mempunyai <strong>{backlogItems.length} perkara dirancang</strong> yang belum dijadualkan ke mana-mana hari.
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToPlan}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            Susun Perancangan Sekarang →
          </button>
        </div>
      )}

      {/* Responsive Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: duration }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateInfo = getDayDateInfo(dayNum);
          const dayContext = getDayContextLabel(stay, dayNum);
          const dayItems = getSortedDayItems(dayNum);
          const isTravel = dayContext.type === 'travel_day';
          const visibleLimit = 5;
          const visibleItems = dayItems.slice(0, visibleLimit);
          const remainingCount = dayItems.length - visibleLimit;
          const completedCount = dayItems.filter((i) => i.isCompleted).length;

          return (
            <div
              key={dayNum}
              id={`calendar-day-card-${dayNum}`}
              className={`bg-white rounded-2xl border shadow-2xs transition-all flex flex-col overflow-hidden group ${
                isTravel
                  ? 'border-orange-200/90 hover:border-orange-300'
                  : 'border-stone-200 hover:border-amber-300'
              }`}
            >
              {/* Day Card Header with Obvious Day Context */}
              <div
                className={`p-4 border-b flex items-center justify-between transition-colors ${
                  isTravel
                    ? 'bg-orange-50/70 border-orange-200/80'
                    : 'bg-stone-50/90 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex flex-col items-center justify-center min-w-11 px-2 py-1 rounded-xl shadow-2xs border ${
                      isTravel
                        ? 'bg-white border-orange-200 text-orange-950'
                        : 'bg-white border-stone-200 text-stone-900'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isTravel ? 'text-orange-800' : 'text-amber-800'
                      }`}
                    >
                      {dateInfo.dayName}
                    </span>
                    <span className="text-base font-extrabold leading-none">
                      {dateInfo.dayOfMonth}
                    </span>
                    {dateInfo.monthShort && (
                      <span className="text-[9px] font-semibold text-stone-400">
                        {dateInfo.monthShort}
                      </span>
                    )}
                  </div>

                  <div>
                    {/* Semantic Context Label: 🚗 Perjalanan / 🏠 Stay Day 1 */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                          isTravel
                            ? 'bg-orange-100 text-orange-950 border-orange-300/80'
                            : 'bg-amber-100 text-amber-950 border-amber-300/80'
                        }`}
                      >
                        <span>{dayContext.icon} {dayContext.label}</span>
                      </span>
                    </div>

                    <span className="text-[11px] text-stone-500 block mt-1">
                      {dayItems.length === 0
                        ? (isTravel ? 'Logistik perjalanan' : 'Tiada agenda')
                        : `${completedCount}/${dayItems.length} selesai`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  title="Tambah aktiviti untuk hari ini"
                  onClick={() => onAddItem(dayNum, isTravel ? 'morning' : 'morning')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isTravel
                      ? 'text-orange-500 hover:text-orange-800 hover:bg-orange-100'
                      : 'text-stone-400 hover:text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Day Items List (Target: 4-5 items) */}
              <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2 min-h-52">
                {dayItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-stone-400">
                    <span className="text-2xl mb-1">{isTravel ? '🚗' : '🍃'}</span>
                    <p className="text-xs font-medium text-stone-600">
                      {isTravel ? 'Perjalanan & Rehat Jalanan' : 'Hari Santai / Bebas'}
                    </p>
                    <p className="text-[10px] text-stone-400 max-w-[180px] mt-0.5">
                      {isTravel
                        ? 'Boleh tambah perhentian R&R, waktu bertolak, atau ketibaan.'
                        : 'Masa luang untuk berehat dan aktiviti bebas bersama.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => onAddItem(dayNum, 'morning')}
                      className={`mt-2 text-[11px] font-bold hover:underline ${
                        isTravel ? 'text-orange-700' : 'text-amber-700'
                      }`}
                    >
                      + Tambah agenda {isTravel ? 'perjalanan' : 'stay'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 flex-1">
                    {visibleItems.map((item) => {
                      const slotMeta = TIME_SLOTS[item.timeSlot] || TIME_SLOTS.morning;
                      return (
                        <div
                          key={item.id}
                          onClick={() => onEditItem(item)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 group/item ${
                            item.isCompleted
                              ? 'bg-stone-50/70 border-stone-200 text-stone-400'
                              : isTravel
                              ? 'bg-white hover:bg-orange-50/40 border-stone-200/80 hover:border-orange-200 text-stone-800 shadow-2xs'
                              : 'bg-white hover:bg-amber-50/40 border-stone-200/80 hover:border-amber-200 text-stone-800 shadow-2xs'
                          }`}
                        >
                          <button
                            type="button"
                            aria-label="Tanda selesai"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleComplete(item.id);
                            }}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              item.isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-stone-300 hover:border-amber-500 bg-stone-50'
                            }`}
                          >
                            {item.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs shrink-0" title={slotMeta.label}>
                                {slotMeta.icon}
                              </span>
                              <span
                                className={`text-xs font-bold truncate ${
                                  item.isCompleted ? 'line-through text-stone-400' : 'text-stone-900'
                                }`}
                              >
                                {item.title}
                              </span>
                            </div>

                            {/* Secondary Metadata (light/compact) */}
                            {(item.timeSpecific || item.locationName) && (
                              <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5 truncate pl-4">
                                {item.timeSpecific && (
                                  <span className="font-semibold text-amber-900/80">
                                    {item.timeSpecific}
                                  </span>
                                )}
                                {item.locationName && (
                                  <span className="truncate">📍 {item.locationName}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Progressive Disclosure Footer: "Lihat Butiran" and "+ Tambah" */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDayDetail(dayNum)}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      remainingCount > 0
                        ? isTravel
                          ? 'text-orange-800 bg-orange-50 hover:bg-orange-100'
                          : 'text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <span>{remainingCount > 0 ? `+ ${remainingCount} lagi (Butiran)` : 'Lihat Butiran'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onAddItem(dayNum, isTravel ? 'morning' : 'morning')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah</span>
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Full Day Details Modal / Popover (Progressive Disclosure) */}
      {selectedDayDetail !== null && activeDayDateInfo && activeDayContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            id="full-day-detail-modal"
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-stone-200 overflow-hidden"
          >
            {/* Modal Header */}
            <div
              className={`px-6 py-4 border-b flex items-center justify-between ${
                activeDayContext.type === 'travel_day'
                  ? 'bg-orange-50/80 border-orange-200'
                  : 'bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex flex-col items-center justify-center min-w-12 px-2.5 py-1.5 rounded-xl shadow-2xs text-white ${
                    activeDayContext.type === 'travel_day' ? 'bg-orange-600' : 'bg-amber-600'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {activeDayDateInfo.dayName}
                  </span>
                  <span className="text-lg font-extrabold leading-none">
                    {activeDayDateInfo.dayOfMonth}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-stone-900">
                      {activeDayContext.label} ({activeDayDateInfo.dateFormatted})
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500">
                    {activeDayContext.type === 'travel_day'
                      ? 'Hari Perjalanan & Logistik'
                      : 'Hari Penginapan Penuh'} · {activeDayDetailItems.length} agenda dirancang
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Complete list of items for this day */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {activeDayDetailItems.length === 0 ? (
                <div className="py-10 text-center text-stone-400 space-y-2">
                  <span className="text-3xl">{activeDayContext.type === 'travel_day' ? '🚗' : '🍃'}</span>
                  <p className="text-sm font-semibold text-stone-600">
                    {activeDayContext.type === 'travel_day'
                      ? 'Tiada catatan logistik perjalanan untuk hari ini.'
                      : 'Tiada agenda dirancang untuk hari ini.'}
                  </p>
                  <p className="text-xs text-stone-400">
                    {activeDayContext.type === 'travel_day'
                      ? 'Anda boleh menambah jadual bertolak, perhentian makan, atau ketibaan.'
                      : 'Luangkan masa untuk aktiviti bebas atau berehat.'}
                  </p>
                </div>
              ) : (
                activeDayDetailItems.map((item) => {
                  const slotMeta = TIME_SLOTS[item.timeSlot] || TIME_SLOTS.morning;
                  const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.optional;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedDayDetail(null);
                        onEditItem(item);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        item.isCompleted
                          ? 'bg-stone-50 border-stone-200 opacity-70'
                          : 'bg-white hover:bg-amber-50/40 border-stone-200 shadow-2xs hover:border-amber-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(item.id);
                        }}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          item.isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-stone-300 hover:border-amber-500 bg-stone-50'
                        }`}
                      >
                        {item.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm">{slotMeta.icon}</span>
                          <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                            {slotMeta.label}
                          </span>
                          {item.timeSpecific && (
                            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                              {item.timeSpecific}
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${pConfig.badgeClass}`}>
                            {pConfig.label}
                          </span>
                        </div>

                        <h4
                          className={`text-sm font-bold ${
                            item.isCompleted ? 'line-through text-stone-400' : 'text-stone-900'
                          }`}
                        >
                          {item.title}
                        </h4>

                        {item.description && (
                          <p className="text-xs text-stone-600 pt-0.5">{item.description}</p>
                        )}

                        {(item.locationName || item.personInCharge) && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-1">
                            {item.locationName && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-400" />
                                {item.locationName}
                              </span>
                            )}
                            {item.personInCharge && (
                              <span className="inline-flex items-center gap-1 text-amber-900">
                                <User className="w-3 h-3 text-amber-600" />
                                PIC: {item.personInCharge}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              {onNavigateToPlan ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDayDetail(null);
                    onNavigateToPlan();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-white border border-stone-300 px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <List className="w-4 h-4 text-amber-700" />
                  <span>📝 Susun di Perancangan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedDayDetail(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <span>Tutup</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const day = selectedDayDetail || 1;
                  setSelectedDayDetail(null);
                  onAddItem(day, 'morning');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
