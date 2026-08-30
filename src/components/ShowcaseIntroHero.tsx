import React from 'react';
import {
  Sparkles,
  Lock,
  Play,
  ArrowRight,
  Layers,
  CalendarDays,
  Calendar,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Stay } from '../types';

interface ShowcaseIntroHeroProps {
  activeStay: Stay | null;
  onExploreDemo: () => void;
  onOpenWalkthrough: () => void;
}

export const ShowcaseIntroHero: React.FC<ShowcaseIntroHeroProps> = ({
  activeStay,
  onExploreDemo,
  onOpenWalkthrough
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();

  return (
    <section
      id="showcase-intro-hero"
      className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6 relative overflow-hidden"
    >
      {/* Background subtle radial gradient accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      
      {/* Top Header & Core Purpose */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 border border-amber-300/80 text-xs font-black tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>✨ DEMO INTERAKTIF</span>
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Eksplorasi contoh sebelum mula merancang
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight font-sans">
              “Plan the stay, Don&apos;t miss something.”
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal">
              Platform perancangan agenda ringkas untuk short stay 2–4 hari. Senaraikan apa yang ingin dilakukan, susun mengikut hari, dan lihat keseluruhan stay dalam Calendar.
            </p>
          </div>
        </div>

        {/* Primary CTA Button Group */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 self-start w-full sm:w-auto">
          <button
            id="hero-try-demo-btn"
            type="button"
            onClick={onExploreDemo}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-2xl shadow-xs shadow-amber-600/20 active:scale-98 transition-all cursor-pointer"
          >
            <span>✨ Cuba Contoh</span>
          </button>

          {!isAuthenticated ? (
            <button
              id="hero-start-planning-btn"
              type="button"
              onClick={() => openAuthModal('Log masuk dengan Google untuk mula merancang stay peribadi anda di ruang selamat.')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black rounded-2xl shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <span>🔐 Mula Rancang</span>
            </button>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ruang Peribadi Aktif</span>
            </span>
          )}

          {/* Secondary Action: Video Walkthrough */}
          <button
            id="hero-how-it-works-btn"
            type="button"
            onClick={onOpenWalkthrough}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-700 hover:text-amber-800 bg-stone-100 hover:bg-amber-50/80 rounded-xl transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 text-amber-600 fill-amber-600" />
            <span>Bagaimana StayPlan berfungsi? ▶</span>
          </button>
        </div>
      </div>

      {/* Product Story / 5-Stage Workflow Bar */}
      <div className="pt-4 border-t border-stone-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <span>Aliran Kerja StayPlan:</span>
          </span>
          <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
            Mudah • Teratur • Tanpa Jadual Memenatkan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* Step 1: Kumpul Idea */}
          <div className="p-3 rounded-2xl bg-stone-50/90 border border-stone-200/80 flex items-start gap-2.5">
            <span className="text-xl p-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs shrink-0">
              📝
            </span>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-700">1. Kumpul</span>
                <span className="text-[10px] text-stone-400">•</span>
                <h4 className="text-xs font-bold text-stone-900">Perancangan</h4>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Kumpul semua aktiviti & keinginan tanpa risau susunan masa dahulu.
              </p>
            </div>
          </div>

          {/* Step 2: Susun */}
          <div className="p-3 rounded-2xl bg-stone-50/90 border border-stone-200/80 flex items-start gap-2.5">
            <span className="text-xl p-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs shrink-0">
              🗂️
            </span>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-700">2. Susun</span>
                <span className="text-[10px] text-stone-400">•</span>
                <h4 className="text-xs font-bold text-stone-900">Agih & Keutamaan</h4>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Tapis aktiviti Wajib vs Pilihan & agihkan ke hari perjalanan atau stay.
              </p>
            </div>
          </div>

          {/* Step 3: Calendar */}
          <div className="p-3 rounded-2xl bg-stone-50/90 border border-stone-200/80 flex items-start gap-2.5">
            <span className="text-xl p-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs shrink-0">
              📅
            </span>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-700">3. Pantau</span>
                <span className="text-[10px] text-stone-400">•</span>
                <h4 className="text-xs font-bold text-stone-900">Kalendar</h4>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Gambaran lengkap slot harian (Pagi, Petang, Malam) & kongsi terus ke WhatsApp.
              </p>
            </div>
          </div>

          {/* Step 4: Checklist & Info */}
          <div className="p-3 rounded-2xl bg-stone-50/90 border border-stone-200/80 flex items-start gap-2.5">
            <span className="text-xl p-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs shrink-0">
              📋
            </span>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-700">4. Siap</span>
                <span className="text-[10px] text-stone-400">•</span>
                <h4 className="text-xs font-bold text-stone-900">Semak & Info</h4>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Senarai barang packing & simpan maklumat homestay dalam satu tempat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
