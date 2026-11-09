import React, { useState } from 'react';
import { X, Share2, Copy, Check, Printer, MessageCircle, Sparkles, ExternalLink, Lock, ShieldCheck } from 'lucide-react';
import { Stay, AgendaItem, ChecklistItem } from '../types';
import { generateWhatsAppMessage } from '../utils/formatters';

interface ShareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: Stay | null;
  agendaItems: AgendaItem[];
  checklistItems: ChecklistItem[];
}

export const ShareExportModal: React.FC<ShareExportModalProps> = ({
  isOpen,
  onClose,
  stay,
  agendaItems,
  checklistItems
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'print'>('whatsapp');
  const [includeSensitiveInfo, setIncludeSensitiveInfo] = useState(false);

  if (!isOpen) return null;

  if (!stay) {
    return (
      <div id="share-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div id="share-modal-container" className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
          <button
            id="share-modal-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto shadow-2xs">
            <Share2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Belum Ada Trip Untuk Dikongsi</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Sila cipta atau pilih rancangan trip terlebih dahulu untuk menjana ringkasan jadual WhatsApp dan mencetak perancangan anda.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Faham
          </button>
        </div>
      </div>
    );
  }

  const whatsappMessage = generateWhatsAppMessage(stay, agendaItems, checklistItems, includeSensitiveInfo);

  const handleCopyWhatsapp = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsapp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="share-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="share-modal-container"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-7 space-y-5"
      >
        {/* Close Button */}
        <button
          id="share-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Share2 className="w-3.5 h-3.5" />
            <span>Kongsi & Eksport StayPlan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kongsi Agenda: {stay.title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hantar jadual kemas terus ke WhatsApp keluarga atau cetak salinan fizikal A4.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-teal-600" />
            <span>Format WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'print'
                ? 'border-amber-600 text-amber-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-600" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>

        {/* TAB 1: WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            {/* Sensitive Data Privacy Control (SES v4.5 3.5) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <input
                id="include-sensitive-checkbox"
                type="checkbox"
                checked={includeSensitiveInfo}
                onChange={(e) => setIncludeSensitiveInfo(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="include-sensitive-checkbox" className="text-xs text-slate-700 cursor-pointer select-none space-y-0.5">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Sertakan Kata Laluan Wi-Fi & Kod Akses Kunci
                </span>
                <span className="text-[11px] text-slate-500 block leading-relaxed">
                  {includeSensitiveInfo
                    ? '⚠️ Kata laluan Wi-Fi dan kod PIN kunci akan dimasukkan dalam teks mesej.'
                    : '🔒 Dilindungi: Kata laluan Wi-Fi & kod PIN pintu tidak disertakan dalam mesej berkongsi.'}
                </span>
              </label>
            </div>

            {/* Message Preview */}
            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap border border-slate-800 leading-relaxed selection:bg-teal-500 selection:text-white">
              {whatsappMessage}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-500">
                Format lengkap dengan emoji & slot masa harian.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyWhatsapp}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Berjaya Disalin!' : 'Salin Mesej'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenWhatsapp}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hantar ke WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRINT & PDF */}
        {activeTab === 'print' && (
          <div className="space-y-4 text-center py-6 px-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="inline-flex p-4 rounded-2xl bg-amber-100 text-amber-800 mb-2">
              <Printer className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Cetak Jadual Fizikal A4</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Cetak agenda untuk ditampal di ruang tamu atau peti sejuk homestay supaya semua ahli keluarga boleh merujuk aktiviti harian dengan mudah.
            </p>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Buka Dialog Cetak / Simpan sebagai PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
