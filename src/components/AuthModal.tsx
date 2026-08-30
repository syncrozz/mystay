import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, KeyRound, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, unlockWithPin, authModalContext } = useAuth();
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setPin('');
      setErrorMsg(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await unlockWithPin(pin);
      if (!result.success) {
        setErrorMsg(result.message || 'PIN tidak sah.');
        setPin('');
      } else {
        closeAuthModal();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ralat membuka kunci.');
      setPin('');
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="auth-modal-card"
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative overflow-hidden text-stone-900"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon / Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900">
              Pengesahan Akses Pemilik
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              {authModalContext || 'Masukkan PIN akses untuk meneruskan tindakan.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 text-center">
              PIN Akses (4 Digit)
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPin(val);
                setErrorMsg(null);
              }}
              placeholder="••••"
              disabled={isSubmitting}
              className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 px-4 bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-bold text-stone-900"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || pin.length < 4}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-2xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengesahkan...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sahkan PIN</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>StayPlan Personal • Ruang Peribadi Selamat</span>
        </div>
      </div>
    </div>
  );
};
