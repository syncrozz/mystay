import React from 'react';
import { AgendaItem } from '../types';
import { Sparkles, AlertCircle, CheckCircle2, Coffee, ShieldAlert, HeartHandshake } from 'lucide-react';

interface PacingAdviceCardProps {
  agendaItems: AgendaItem[];
  selectedDay: number;
  totalDays: number;
}

export const PacingAdviceCard: React.FC<PacingAdviceCardProps> = ({
  agendaItems,
  selectedDay,
  totalDays
}) => {
  const currentDayItems = agendaItems.filter((i) => (selectedDay === 0 ? true : i.dayNumber === selectedDay));
  const mustDos = currentDayItems.filter((i) => i.priority === 'must_do').length;
  const optionals = currentDayItems.filter((i) => i.priority === 'optional').length;
  const foodItems = currentDayItems.filter((i) => i.priority === 'food').length;
  const restItems = currentDayItems.filter((i) => i.priority === 'rest').length;
  const totalCount = currentDayItems.length;

  let paceStatus: 'spacious' | 'balanced' | 'overloaded' = 'balanced';
  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let title = 'Jadual Selesa & Santai';
  let advice = 'Pilihan aktiviti yang tenang. Ada ruang secukupnya untuk bersembang santai dan berehat tanpa tergesa-gesa.';

  if (selectedDay !== 0) {
    if (totalCount >= 5 || mustDos >= 4) {
      paceStatus = 'overloaded';
      badgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
      title = 'Jadual Agak Padat!';
      advice = `Hari ke-${selectedDay} mempunyai ${totalCount} aktiviti (${mustDos} Wajib). Pertimbangkan untuk menukar beberapa item kepada "Pilihan 🌴" atau sediakan slot rehat agar tidak letih.`;
    } else if (totalCount <= 2 && mustDos <= 2) {
      paceStatus = 'spacious';
      badgeColor = 'bg-teal-100 text-teal-900 border-teal-300';
      title = 'Jadual Sangat Selesa 🍃';
      advice = `Hari ke-${selectedDay} sangat santai. Bagus untuk memberi ruang kepada momen spontan bersama keluarga atau tetamu.`;
    } else {
      paceStatus = 'balanced';
      badgeColor = 'bg-teal-100 text-teal-950 border-teal-300';
      title = 'Keseimbangan Baik ⚖️';
      advice = `Nisbah aktiviti wajib (${mustDos}) dan makanan/rehat (${foodItems + restItems}) berada dalam rentak yang sihat untuk short stay.`;
    }
  } else {
    // Whole stay view
    const avgPerDay = totalCount / (totalDays || 1);
    if (avgPerDay > 4.5) {
      paceStatus = 'overloaded';
      badgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
      title = 'Perancangan Keseluruhan Agak Padat';
      advice = 'Purata aktiviti harian agak tinggi. Ingat prinsip StayPlan: "Plan the stay, not just the calendar" — utamakan kualiti kehadiran berbanding kuantiti lokasi.';
    } else {
      paceStatus = 'balanced';
      badgeColor = 'bg-teal-100 text-teal-950 border-teal-300';
      title = 'Rentak Keseluruhan Ideal';
      advice = 'Jadual keseluruhan seimbang dan fleksibel. Sesuai untuk percutian atau ziarah yang tenang.';
    }
  }

  return (
    <div
      id="pacing-advice-card"
      className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
            <Sparkles className="w-4 h-4" />
          </span>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pantauan Kepadatan Jadual {selectedDay === 0 ? '(Semua Hari)' : `(Hari ${selectedDay})`}
          </h4>
        </div>
        <span className={`self-start sm:self-auto px-2.5 py-1 text-xs font-bold rounded-lg border ${badgeColor}`}>
          {title}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200/70 text-center">
          <p className="text-lg font-black text-teal-950 leading-none">{mustDos}</p>
          <p className="text-[10px] font-semibold text-teal-700 mt-1">⭐ Wajib</p>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-center">
          <p className="text-lg font-black text-emerald-900 leading-none">{optionals}</p>
          <p className="text-[10px] font-semibold text-emerald-700 mt-1">🌴 Pilihan</p>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70 text-center">
          <p className="text-lg font-black text-rose-900 leading-none">{foodItems}</p>
          <p className="text-[10px] font-semibold text-rose-700 mt-1">🍽️ Makan</p>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/70 text-center">
          <p className="text-lg font-black text-indigo-900 leading-none">{restItems}</p>
          <p className="text-[10px] font-semibold text-indigo-700 mt-1">☕ Rehat</p>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
        💡 {advice}
      </p>
    </div>
  );
};
