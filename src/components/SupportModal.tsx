import React, { useState } from 'react';
import { X, Heart, Download, Check, Copy, ChevronDown, ChevronUp, ShieldCheck, Sparkles } from 'lucide-react';
import { ASSETS } from '../utils/constants';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  if (!isOpen) return null;

  const handleCopyAcc = () => {
    navigator.clipboard.writeText('StayPlan / RYT Sumbangan');
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2500);
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = ASSETS.QR_SUPPORT;
    link.download = 'StayPlan-DuitNow-QR.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  return (
    <div id="support-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="support-modal-container"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6"
      >
        {/* Close Button */}
        <button
          id="support-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-500 mb-1 ring-8 ring-rose-50/50">
            <Heart className="w-6 h-6 fill-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Sokongan untuk StayPlan</h2>
          <p className="text-sm text-stone-600 max-w-sm mx-auto">
            StayPlan dibina dengan kasih sayang untuk memudahkan setiap detik berharga short stay anda bersama keluarga.
          </p>
        </div>

        {/* Philosophy Card */}
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-semibold text-amber-950">"Your StayPlan is yours. Plan freely. Your space is yours."</p>
            <p className="text-amber-800">
              Platform ini percuma & bebas iklan. Sebarang sumbangan ikhlas amat dihargai bagi menampung kos pelayan dan pembangunan berterusan.
            </p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4">
          <div className="inline-block p-3 bg-white rounded-xl shadow-sm border border-stone-200">
            <img
              id="duitnow-qr-image"
              src={ASSETS.QR_SUPPORT}
              alt="DuitNow QR Code Sumbangan"
              className="w-56 h-56 object-contain rounded-lg mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Imbas menggunakan mana-mana DuitNow QR App</p>
            <p className="text-sm font-bold text-stone-800">DuitNow QR / Malaysian National QR</p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              id="download-qr-btn"
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Simpan QR Code
            </button>
            <button
              id="copy-qr-note-btn"
              onClick={handleCopyAcc}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg shadow-2xs transition-colors"
            >
              {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAcc ? 'Disalin!' : 'Salin Rujukan'}
            </button>
          </div>
        </div>

        {/* How to Pay Accordion */}
        <div className="space-y-2 border-t border-stone-100 pt-4">
          <h3 className="text-sm font-bold text-stone-800">Panduan Imbasan DuitNow QR</h3>
          
          <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-200 text-xs">
            {/* Step 1 */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion(0)}
                className="w-full flex items-center justify-between p-3.5 text-left bg-stone-50 hover:bg-stone-100 font-medium text-stone-800 transition-colors"
              >
                <span>1. Langkah melalui Aplikasi Bank (MAE, CIMB OCTO, Bank Islam, RHB, dll.)</span>
                {openAccordion === 0 ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
              </button>
              {openAccordion === 0 && (
                <div className="p-3.5 bg-white text-stone-600 space-y-1.5 leading-relaxed">
                  <p>1. Buka aplikasi perbankan mudah alih anda.</p>
                  <p>2. Tekan ikon <strong>"Scan / QR Pay"</strong> di skrin utama.</p>
                  <p>3. Halakan kamera ke arah kod QR di atas (atau pilih gambar dari galeri jika dimuat turun).</p>
                  <p>4. Masukkan jumlah sumbangan ikhlas anda dan sahkan transaksi.</p>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion(1)}
                className="w-full flex items-center justify-between p-3.5 text-left bg-stone-50 hover:bg-stone-100 font-medium text-stone-800 transition-colors"
              >
                <span>2. Langkah melalui Touch 'n Go eWallet / GrabPay</span>
                {openAccordion === 1 ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
              </button>
              {openAccordion === 1 && (
                <div className="p-3.5 bg-white text-stone-600 space-y-1.5 leading-relaxed">
                  <p>1. Buka Touch 'n Go eWallet atau GrabPay anda.</p>
                  <p>2. Tekan <strong>"Scan"</strong> dan imbas kod DuitNow QR ini.</p>
                  <p>3. Masukkan sebarang amaun yang ingin disumbangkan.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security & Privacy footnote */}
        <div className="flex items-center justify-center gap-1.5 text-stone-400 text-xs text-center pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Privasi & data StayPlan anda kekal selamat di peranti anda.</span>
        </div>
      </div>
    </div>
  );
};
