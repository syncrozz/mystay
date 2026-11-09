import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ASSETS } from '../utils/constants';
import {
  Calendar,
  ListChecks,
  Compass,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signInWithGoogle();
      // On success, onAuthStateChanged in AuthProvider updates session and redirects automatically
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Tetingkap log masuk telah ditutup. Sila cuba lagi.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Tetingkap popup disekat oleh pelayar anda. Sila benarkan popup untuk log masuk.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('Ralat sambungan internet. Sila semak sambungan anda.');
      } else {
        setErrorMessage(err?.message || 'Gagal log masuk dengan akaun Google. Sila cuba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-950">
      
      {/* Top Ambient Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600" />

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg space-y-6">

          {/* Central Card */}
          <div
            id="stayplan-login-card"
            className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-7 relative overflow-hidden"
          >
            {/* Header Brand Section */}
            <div className="text-center space-y-3">
              <div className="relative inline-block group">
                <img
                  src={ASSETS.LOGO}
                  alt="StayPlan Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl shadow-sm object-cover border border-slate-200 transition-transform group-hover:scale-105 duration-200"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500 border-2 border-white"></span>
                </span>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-950 text-xs font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Platform Perancangan Short Stay</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Stay<span className="text-teal-600">Plan</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 font-semibold mt-1">
                  &ldquo;Plan the stay, don&apos;t miss something.&rdquo;
                </p>

                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                  Susun agenda ringkas untuk short stay 2–4 hari. Senaraikan apa yang ingin dilakukan, susun mengikut hari, dan pantau dalam Kalendar.
                </p>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-teal-700 font-bold text-xs">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Rancang Pantas</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Brain dump aktiviti fleksibel tanpa sekatan borang rumit.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Kalendar Bersepadu</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Paparan visual multi-hari yang diselaraskan secara automatik.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>Senarai Semak</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Barang keperluan percutian, ubat-ubatan & buah tangan.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Awan Firestore</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Disimpan selamat mengikut akaun Google peribadi anda.
                </p>
              </div>
            </div>

            {/* Error Message Notification */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Primary Action: Continue with Google Button */}
            <div className="space-y-3 pt-1">
              <button
                id="login-continue-google-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 hover:text-slate-900 font-bold text-sm rounded-2xl border-2 border-slate-300 hover:border-slate-400 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                    <span>Menghubungkan ke Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Teruskan dengan Google</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-500 font-medium">
                Log masuk selamat menggunakan akaun Google anda. Tiada pendaftaran manual atau kata laluan diperlukan.
              </p>
            </div>

            {/* Zero-Trust Security Guarantee Badge */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Privasi Terjamin • Ruang Data Terasing Mengikut Akaun Google</span>
            </div>

          </div>

          {/* Footer Info */}
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-500 font-medium">
              SYNCROZZ — STAYPLAN • SES v4.5 Certified
            </p>
            <p className="text-[11px] text-slate-400">
              Bukan platform tempahan hotel. Aplikasi perancangan jadual peribadi.
            </p>
          </div>

        </div>
      </main>

    </div>
  );
};
