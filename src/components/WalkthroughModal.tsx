import React, { useState } from 'react';
import {
  X,
  Play,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ListChecks,
  Home,
  ArrowRight,
  Lightbulb,
  Clock,
  Compass,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreDemo: () => void;
}

const STEPS = [
  {
    step: 1,
    title: 'Kumpul Idea & Aktiviti',
    tagline: 'Senaraikan apa yang ingin dilakukan',
    icon: '📝',
    desc: 'Tulis semua perkara atau tempat yang anda ingin kunjungi tanpa risau tentang susunan masa dahulu.',
    tip: 'Contoh: Makan nasi dagang, ziarah Tok, beli keropok lekor, santai kopi petang.'
  },
  {
    step: 2,
    title: 'Susun & Agih (Organise)',
    tagline: 'Agihkan mengikut hari & slot',
    icon: '🗂️',
    desc: 'Pindahkan idea ke hari yang sesuai (Hari Perjalanan vs Stay Day) dan pilih keutamaan (Wajib atau Santai).',
    tip: 'Memastikan jadual tidak terlebih padat terutamanya pada hari perjalanan (Travel Day).'
  },
  {
    step: 3,
    title: 'Kalendar Stay (Calendar View)',
    tagline: 'Gambaran penuh & slot harian 2–4 hari',
    icon: '📅',
    desc: 'Lihat aliran masa harian (Pagi, Tengah Hari, Petang, Malam), semak butiran lokasi & PIC, serta kongsi jadual ke WhatsApp.',
    tip: 'Tandakan aktiviti yang telah selesai dan pantau pacing rehat anda.'
  },
  {
    step: 4,
    title: 'Senarai Semak & Maklumat Stay',
    tagline: 'Persediaan packing & logistik',
    icon: '📋',
    desc: 'Semak senarai kelengkapan barang sebelum bertolak dan simpan maklumat stay seperti WiFi & laluan.',
    tip: 'Eksport atau kongsi jadual ringkas terus kepada ahli keluarga atau hos homestay.'
  }
];

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({
  isOpen,
  onClose,
  onExploreDemo
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = STEPS[activeStepIndex];

  return (
    <div
      id="walkthrough-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="walkthrough-modal-container"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 sm:p-8 space-y-6"
      >
        {/* Close Button */}
        <button
          id="walkthrough-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Bagaimana StayPlan Berfungsi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            “Plan the stay, don&apos;t miss something.”
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Kitaran perancangan pantas dari idea rawak kepada agenda harian yang santai dan seimbang.
          </p>
        </div>

        {/* Video Walkthrough Section / Area */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-900 text-white relative overflow-hidden shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-600 text-white">
                <Play className="w-3.5 h-3.5 fill-white" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-stone-100">Video Walkthrough 30 Saat</h4>
                <p className="text-[10px] text-stone-400">Ringkasan konsep 4-langkah StayPlan</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
              30 Saat
            </span>
          </div>

          {/* Interactive Visual Step Preview Card */}
          <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700/80 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 rounded-xl bg-stone-700/80 shrink-0">
                {currentStep.icon}
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Langkah {currentStep.step} daripada 4
                </span>
                <h3 className="text-sm font-extrabold text-white">
                  {currentStep.title}
                </h3>
                <p className="text-xs text-stone-300 mt-0.5">
                  {currentStep.desc}
                </p>
              </div>
            </div>

            <div className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-700/50 text-[11px] text-amber-200/90 flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{currentStep.tip}</span>
            </div>
          </div>

          {/* Step Selector Dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {STEPS.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeStepIndex === idx
                    ? 'w-6 bg-amber-500'
                    : 'w-2 bg-stone-700 hover:bg-stone-600'
                }`}
                aria-label={`Langkah ${s.step}`}
              />
            ))}
          </div>
        </div>

        {/* 4-Step Story Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STEPS.map((item, idx) => {
            const isSelected = activeStepIndex === idx;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-2xs'
                    : 'bg-stone-50/60 hover:bg-stone-100/80 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <span className="text-[10px] font-bold text-amber-700">
                      Langkah {item.step}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 leading-tight">
                      {item.title}
                    </h4>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5 line-clamp-2">
                  {item.tagline}
                </p>
              </div>
            );
          })}
        </div>

        {/* Modal Footer CTAs */}
        <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onExploreDemo();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <span>✨ Lihat Contoh</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <span>Faham, Teruskan Merancang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
