import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, KeyRound, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export const AdminModeModal: React.FC = () => {
  const { isAdminModalOpen, closeAdminModal, validateAndActivateAdmin, adminModalContext } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and reset state whenever modal is opened
  useEffect(() => {
    if (isAdminModalOpen) {
      setPin('');
      setErrorMsg(null);
      setIsSubmitting(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAdminModalOpen]);

  // Handle unified validation logic
  const handleValidatePin = useCallback(
    async (pinToValidate: string) => {
      const clean = pinToValidate.trim();
      if (clean.length !== 4 || isSubmitting) return;

      setIsSubmitting(true);
      setErrorMsg(null);

      try {
        const result = await validateAndActivateAdmin(clean);
        if (!result.success) {
          setErrorMsg(result.message || 'PIN salah. Sila cuba lagi.');
          setPin('');
          // Re-focus input for rapid retry
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      } catch (err: any) {
        setErrorMsg('PIN salah. Sila cuba lagi.');
        setPin('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, validateAndActivateAdmin]
  );

  // Handle change with auto-submit on 4th digit
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 4);
    setPin(digitsOnly);
    if (errorMsg) setErrorMsg(null);

    // Auto submit on 4th digit
    if (digitsOnly.length === 4 && !isSubmitting) {
      handleValidatePin(digitsOnly);
    }
  };

  // Keyboard navigation: Enter to submit, Escape to close
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAdminModal();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (pin.length === 4) {
        handleValidatePin(pin);
      }
    }
  };

  // Global Escape key listener when modal is active
  useEffect(() => {
    if (!isAdminModalOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAdminModal();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAdminModalOpen, closeAdminModal]);

  if (!isAdminModalOpen) return null;

  return (
    <div
      id="admin-mode-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          closeAdminModal();
        }
      }}
    >
      <div
        id="admin-mode-modal-card"
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        {/* Ambient Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600" />

        {/* Close Button */}
        <button
          id="admin-modal-close-btn"
          type="button"
          onClick={closeAdminModal}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer disabled:opacity-40"
          title="Tutup (Escape)"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon / Branding */}
        <div className="text-center space-y-2.5 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 id="admin-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              🔒 Akses Mod Admin
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {adminModalContext || 'Sila masukkan 4-digit PIN keselamatan.'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            id="admin-pin-error-alert"
            className="mb-4 p-3 text-xs bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center gap-2 animate-in shake duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* PIN Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleValidatePin(pin);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <input
              id="admin-pin-input"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Masukkan 4-digit PIN"
              disabled={isSubmitting}
              autoComplete="off"
              autoFocus
              className="w-full text-center text-xl sm:text-2xl tracking-[0.4em] font-mono py-3.5 px-4 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
            />
          </div>

          <button
            id="admin-pin-submit-btn"
            type="submit"
            disabled={isSubmitting || pin.length < 4}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengesahkan...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>🔑 Sahkan PIN Admin</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>Akses Pentadbir • Tambah, Ubah & Urus Pelan</span>
        </div>
      </div>
    </div>
  );
};
