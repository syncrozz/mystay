import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ASSETS } from '../utils/constants';
import { Lock, KeyRound, ShieldCheck, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export const PrivateAccessScreen: React.FC = () => {
  const { unlockWithPin } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDigitClick = (digit: string) => {
    if (pin.length < 6 && !isSubmitting) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg(null);
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handleDeleteDigit = () => {
    if (!isSubmitting) {
      setPin((prev) => prev.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const handleClearPin = () => {
    if (!isSubmitting) {
      setPin('');
      setErrorMsg(null);
    }
  };

  const submitPin = async (pinToSubmit: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await unlockWithPin(pinToSubmit);
      if (!result.success) {
        setErrorMsg(result.message || 'PIN tidak sah.');
        setIsShaking(true);
        setPin('');
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ralat membuka kunci.');
      setIsShaking(true);
      setPin('');
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      submitPin(pin);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      submitPin(pin);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-950">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Card */}
        <div
          id="private-access-card"
          className={`bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 text-center relative overflow-hidden transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {/* Decorative ambient gradient */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600" />

          {/* Logo & Title */}
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={ASSETS.LOGO}
                alt="StayPlan Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl shadow-sm object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-teal-600 text-white rounded-full shadow-xs">
                <Lock className="w-3.5 h-3.5" />
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-950 text-xs font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Edisi Peribadi • Single Owner</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                Stay<span className="text-teal-600">Plan</span> <span className="text-slate-500 text-lg sm:text-xl font-medium">Personal</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Masukkan PIN akses untuk membuka ruang perancangan peribadi anda.
              </p>
            </div>
          </div>

          {/* Hidden text input for physical keyboard entry */}
          <form onSubmit={handleFormSubmit}>
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
                if (val.length === 4) {
                  submitPin(val);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              className="sr-only"
              autoFocus
              aria-label="PIN Akses"
            />
          </form>

          {/* PIN Digit Circles Indicator */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="flex items-center justify-center gap-3 py-2 cursor-pointer"
          >
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    hasDigit
                      ? 'bg-teal-600 scale-110 shadow-xs ring-4 ring-teal-100'
                      : 'bg-slate-200 border border-slate-300'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center justify-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* On-Screen Number Pad (for mobile/tablet touch) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-[280px] mx-auto pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitClick(digit)}
                disabled={isSubmitting}
                className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-teal-50 active:bg-teal-100 text-slate-800 hover:text-teal-950 font-bold text-lg border border-slate-200/80 hover:border-teal-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClearPin}
              disabled={isSubmitting || pin.length === 0}
              className="h-12 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 font-semibold text-xs border border-slate-200 transition-all active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center"
              title="Kosongkan"
            >
              Padam
            </button>

            <button
              type="button"
              onClick={() => handleDigitClick('0')}
              disabled={isSubmitting}
              className="h-12 sm:h-14 rounded-2xl bg-slate-100 hover:bg-teal-50 active:bg-teal-100 text-slate-800 hover:text-teal-950 font-bold text-lg border border-slate-200/80 hover:border-teal-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDeleteDigit}
              disabled={isSubmitting || pin.length === 0}
              className="h-12 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-semibold text-sm border border-slate-200 transition-all active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center"
              title="Undur"
            >
              ⌫
            </button>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              id="unlock-submit-btn"
              type="button"
              onClick={() => submitPin(pin)}
              disabled={isSubmitting || pin.length < 4}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengesahkan Akses...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Buka Kunci StayPlan</span>
                  <ArrowRight className="w-4 h-4 opacity-75" />
                </>
              )}
            </button>
          </div>

          {/* Privacy & Sync Guarantee */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
            <span>Penyelarasan Masa Nyata Firebase Firestore di Semua Peranti</span>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-stone-500 font-medium">
          StayPlan Personal • Plan the stay, don&apos;t miss something
        </p>

      </div>
    </div>
  );
};
