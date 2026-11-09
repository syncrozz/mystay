import React, { useMemo } from 'react';
import { Stay, AgendaItem, ChecklistItem, TimeSlot } from '../types';
import { TIME_SLOTS } from '../utils/constants';
import {
  getTodayStayDayInfo,
  TIME_SLOT_HIERARCHY
} from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  MapPin,
  User,
  ChevronRight,
  ArrowRight,
  ListChecks,
  Compass
} from 'lucide-react';

interface TodayDashboardProps {
  stay: Stay;
  agendaItems: AgendaItem[];
  checklistItems: ChecklistItem[];
  onToggleAgendaComplete: (id: string) => void;
  onToggleChecklistComplete: (id: string) => void;
  onAddAgendaItem: (dayNumber: number, slot: TimeSlot) => void;
  onAddChecklistItem: (item: Omit<ChecklistItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteChecklistItem: (id: string) => void;
  onEditAgendaItem: (item: AgendaItem) => void;
  onNavigateToPlan: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToChecklist: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  stay,
  agendaItems,
  checklistItems,
  onToggleAgendaComplete,
  onAddAgendaItem,
  onEditAgendaItem,
  onNavigateToPlan,
  onNavigateToCalendar,
  onNavigateToChecklist
}) => {
  const { requireAdmin } = useAuth();

  // Live contextual information about today
  const todayInfo = useMemo(() => {
    return getTodayStayDayInfo(stay);
  }, [stay]);

  const targetDay = todayInfo.dayNumber;

  // Filter agenda items for the target day, sorted chronologically from morning (Pagi)
  const todayAllAgendaItems = useMemo(() => {
    return agendaItems
      .filter((item) => item.stayId === stay.id && item.dayNumber === targetDay)
      .sort((a, b) => {
        const slotA = TIME_SLOT_HIERARCHY[a.timeSlot] || 5;
        const slotB = TIME_SLOT_HIERARCHY[b.timeSlot] || 5;
        if (slotA !== slotB) return slotA - slotB;
        return a.title.localeCompare(b.title);
      });
  }, [agendaItems, stay.id, targetDay]);

  // All activities for today are displayed directly starting from morning (Pagi)
  const visibleAgendaItems = todayAllAgendaItems;

  // Count pending checklist items for contextual navigation
  const pendingChecklistCount = useMemo(() => {
    return checklistItems.filter((item) => item.stayId === stay.id && !item.isCompleted).length;
  }, [checklistItems, stay.id]);

  const completedAgendaCount = todayAllAgendaItems.filter((i) => i.isCompleted).length;

  const handleOpenAddForToday = () => {
    requireAdmin(() => {
      onAddAgendaItem(targetDay, todayInfo.currentSlot);
    }, 'Sila sahkan PIN Admin untuk menambah agenda.');
  };

  return (
    <div id="today-dashboard-hub" className="space-y-4 max-w-4xl mx-auto">
      {/* Main Agenda Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
        
        {/* Header: Agenda Hari Ini */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Agenda Hari Ini
            </h2>
          </div>

          {/* Action: Tambah Agenda (Fungsi dikekalkan) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddForToday}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Tambah aktiviti untuk hari ini"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {/* List of Today Agenda Items */}
        {visibleAgendaItems.length === 0 ? (
          <div className="py-8 sm:py-10 text-center space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto px-4">
              <h3 className="text-sm font-bold text-slate-800">
                Tiada agenda dijadualkan untuk hari ini.
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Masa lapang untuk berehat santai atau tambah aktiviti spontan sekarang.
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleOpenAddForToday}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Agenda Hari Ini</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleAgendaItems.map((item) => {
              const slotMeta = TIME_SLOTS[item.timeSlot] || TIME_SLOTS.morning;
              return (
                <div
                  key={item.id}
                  onClick={() => onEditAgendaItem(item)}
                  className={`group relative flex items-center justify-between gap-2 px-3 py-2 sm:py-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    item.isCompleted
                      ? 'bg-slate-50/70 border-slate-200/80'
                      : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Left: Checkbox + Title + Metadata */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAgendaComplete(item.id);
                      }}
                      className="p-1 -m-1 text-slate-400 hover:text-teal-600 transition-colors shrink-0 cursor-pointer"
                      title={item.isCompleted ? 'Tanda belum selesai' : 'Tanda selesai'}
                      aria-label={item.isCompleted ? 'Tanda belum selesai' : 'Tanda selesai'}
                    >
                      {item.isCompleted ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-slate-300 group-hover:text-slate-400" />
                      )}
                    </button>

                    <span
                      className={`text-xs sm:text-[13px] font-semibold truncate leading-snug ${
                        item.isCompleted
                          ? 'line-through text-slate-400 font-normal'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.emoji ? `${item.emoji} ` : ''}{item.title}
                    </span>

                    {item.locationName && (
                      <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 font-normal truncate max-w-[130px]">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{item.locationName}</span>
                      </span>
                    )}

                    {item.personInCharge && (
                      <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-teal-800 font-medium truncate max-w-[100px]">
                        <User className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                        <span className="truncate">{item.personInCharge}</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Specific Time / Priority / Slot Badge / Chevron */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.priority === 'must_do' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                        Wajib
                      </span>
                    )}

                    {item.timeSpecific && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold shrink-0">
                        <Clock className="w-2.5 h-2.5 text-teal-600" />
                        <span>{item.timeSpecific}</span>
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${slotMeta.bgBadge}`}
                    >
                      <span className="text-[10px] leading-none">{item.emoji || slotMeta.icon}</span>
                      <span>{slotMeta.label}</span>
                    </span>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom action bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            {completedAgendaCount} daripada {todayAllAgendaItems.length} agenda hari ini selesai.
          </span>
          <button
            type="button"
            onClick={onNavigateToPlan}
            className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
          >
            <span>Lihat Susunan Penuh</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Quick Context Shortcuts (Mengekalkan navigasi pantas & fungsi ke Kalendar, Perancangan, dan Senarai Semak) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onNavigateToPlan}
          className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all shadow-2xs group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 group-hover:text-teal-900">
            <Compass className="w-4 h-4 text-teal-600 shrink-0" />
            <div>
              <p>Perancangan Penuh</p>
              <p className="text-[11px] text-slate-500 font-normal">Susun & agih aktiviti</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onNavigateToCalendar}
          className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all shadow-2xs group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 group-hover:text-teal-900">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <p>Kalendar</p>
              <p className="text-[11px] text-slate-500 font-normal">Lihat gambaran {stay.durationDays} hari</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onNavigateToChecklist}
          className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all shadow-2xs group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 group-hover:text-teal-900">
            <ListChecks className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p>Senarai Semak</p>
              <p className="text-[11px] text-slate-500 font-normal">{pendingChecklistCount} tugasan belum selesai</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>
      </div>
    </div>
  );
};
