import React, { useState } from 'react';
import { X, Share2, Copy, Check, Printer, MessageCircle, Sparkles, ExternalLink } from 'lucide-react';
import { Stay, AgendaItem, ChecklistItem } from '../types';
import { generateWhatsAppMessage } from '../utils/formatters';

interface ShareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: Stay;
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

  if (!isOpen) return null;

  const whatsappMessage = generateWhatsAppMessage(stay, agendaItems, checklistItems);

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
    <div id="share-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="share-modal-container"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6"
      >
        {/* Close Button */}
        <button
          id="share-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Share2 className="w-3.5 h-3.5" />
            <span>Kongsi & Eksport StayPlan</span>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Kongsi Agenda: {stay.title}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Hantar jadual kemas terus ke group WhatsApp keluarga atau cetak salinan fizikal untuk ditampal di rumah.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-stone-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Format WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'print'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-600" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>

        {/* TAB 1: WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap border border-stone-800 leading-relaxed selection:bg-emerald-500 selection:text-white">
              {whatsappMessage}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-stone-500">
                Format lengkap dengan emoji & slot masa sedia dihantar ke group keluarga.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyWhatsapp}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Berjaya Disalin!' : 'Salin Mesej'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenWhatsapp}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all"
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
          <div className="space-y-4 text-center py-6 px-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="inline-flex p-4 rounded-full bg-amber-100 text-amber-800 mb-2">
              <Printer className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800">Cetak Jadual Fizikal A4</h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
              Cetak agenda untuk ditampal di peti sejuk rumah Tok atau ruang tamu homestay supaya semua orang boleh melihat aktiviti harian dengan jelas.
            </p>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all active:scale-98"
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
