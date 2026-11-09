import React, { useState } from 'react';
import { Stay } from '../types';
import { MapPin, Wifi, Phone, KeyRound, Copy, Check, ExternalLink, Eye, EyeOff, ShieldAlert, FileText, Lock } from 'lucide-react';

interface StayInfoCardProps {
  stay: Stay;
  onEditStay: () => void;
}

export const StayInfoCard: React.FC<StayInfoCardProps> = ({ stay, onEditStay }) => {
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Privacy show/hide state for sensitive credentials
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [showGatePin, setShowGatePin] = useState(false);

  const handleCopyWifi = () => {
    if (stay.wifiPassword) {
      navigator.clipboard.writeText(stay.wifiPassword);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2000);
    }
  };

  const handleCopyAddress = () => {
    const textToCopy = stay.address;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyPin = () => {
    if (stay.gatePin) {
      navigator.clipboard.writeText(stay.gatePin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
<<<<<<< HEAD
=======
  };

  const handleEditClick = () => {
    onEditStay();
>>>>>>> 2f75de8a23807d68cf375500ffa08930910bb0b6
  };

  const handleEditClick = () => {
    onEditStay();
  };

  const mapsQuery = encodeURIComponent(stay.address || '');
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const wazeUrl = `https://waze.com/ul?q=${mapsQuery}`;

  return (
    <div id="stay-info-card" className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Maklumat Penginapan & Akses
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lokasi, navigasi dan data akses penginapan yang selamat
          </p>
        </div>
        <button
          onClick={handleEditClick}
          className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer px-2.5 py-1 rounded-lg hover:bg-teal-50 transition-colors"
        >
          Edit Maklumat
        </button>
      </div>

      {/* SECTION A: General Information (Public/Family Safe) */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Maklumat Umum & Lokasi
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Address & Navigation */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                Alamat & Navigasi
              </span>
              <button
                onClick={handleCopyAddress}
                className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedAddress ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedAddress ? 'Disalin' : 'Salin'}
              </button>
            </div>
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
<<<<<<< HEAD
              {stay.address || 'Alamat belum ditetapkan'}
            </p>
            {stay.address && (
=======
              {stay.address || stay.location || 'Lokasi belum ditetapkan'}
            </p>
            {(stay.address || stay.location) && (
>>>>>>> 2f75de8a23807d68cf375500ffa08930910bb0b6
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
                >
                  <span>Waze</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Host Contact */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Phone className="w-4 h-4 text-slate-500" />
              Tuan Rumah / Bantuan Kecemasan
            </span>
            {stay.hostContact ? (
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-bold text-slate-900">{stay.hostName || 'Tuan Rumah'}</p>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">{stay.hostContact}</p>
                </div>
                <a
                  href={`tel:${stay.hostContact.replace(/[^0-9+]/g, '')}`}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
                >
                  Panggil
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic pt-1">Tiada nombor hubungan dimasukkan.</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION B: Sensitive Access Information (Protected with Show/Hide Controls) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            Maklumat Sensitif & Kredensial Akses
          </span>
          <span className="text-[10px] text-slate-400">Tersembunyi secara lalai untuk privasi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Wi-Fi Details with Privacy Toggle */}
          <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span className="inline-flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-amber-600" />
                Wi-Fi Penginapan
              </span>
              <div className="flex items-center gap-2">
                {stay.wifiPassword && (
                  <button
                    type="button"
                    onClick={() => setShowWifiPassword(!showWifiPassword)}
                    className="text-[11px] text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 cursor-pointer font-semibold"
                    title={showWifiPassword ? 'Sembunyikan Kata Laluan' : 'Pamerkan Kata Laluan'}
                  >
                    {showWifiPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showWifiPassword ? 'Sorok' : 'Papar'}</span>
                  </button>
                )}
                {stay.wifiPassword && (
                  <button
                    type="button"
                    onClick={handleCopyWifi}
                    className="text-[11px] text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedWifi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedWifi ? 'Disalin' : 'Salin'}</span>
                  </button>
                )}
              </div>
            </div>

            {stay.wifiSsid ? (
              <div className="text-xs space-y-1.5 pt-0.5">
                <p className="text-slate-700">
                  SSID: <strong className="text-slate-900 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-amber-200/70">{stay.wifiSsid}</strong>
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                  <span>Kata Laluan:</span>
                  <span className="font-mono font-bold bg-white px-2.5 py-0.5 rounded-md border border-amber-200/70 text-slate-900">
                    {showWifiPassword ? (stay.wifiPassword || '(Tiada password)') : '••••••••••••'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Tiada maklumat Wi-Fi dimasukkan.</p>
            )}
          </div>

          {/* Smartlock / Gate Pin with Privacy Toggle */}
          <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Kunci & Kod Smartlock
              </span>
              <div className="flex items-center gap-2">
                {stay.gatePin && (
                  <button
                    type="button"
                    onClick={() => setShowGatePin(!showGatePin)}
                    className="text-[11px] text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 cursor-pointer font-semibold"
                    title={showGatePin ? 'Sembunyikan Kod Kunci' : 'Pamerkan Kod Kunci'}
                  >
                    {showGatePin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showGatePin ? 'Sorok' : 'Papar'}</span>
                  </button>
                )}
                {stay.gatePin && (
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="text-[11px] text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {copiedPin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPin ? 'Disalin' : 'Salin'}</span>
                  </button>
                )}
              </div>
            </div>

            {stay.gatePin ? (
              <div className="pt-0.5">
                <span className="font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-amber-200/70 text-slate-900 text-xs inline-block">
                  {showGatePin ? stay.gatePin : '••••••••'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic pt-1">Tiada kod atau info kunci khas.</p>
            )}
          </div>
        </div>
      </div>

      {/* House Rules & Important Notes */}
      {((stay.houseRules && stay.houseRules.length > 0) || stay.importantNotes) && (
        <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-950">
            <FileText className="w-4 h-4 text-teal-700" />
            <span>Nota Khas & Peraturan Penginapan</span>
          </div>
          {stay.importantNotes && (
            <p className="text-xs text-teal-950 leading-relaxed font-medium">
              📌 {stay.importantNotes}
            </p>
          )}
          {stay.houseRules && stay.houseRules.length > 0 && (
            <ul className="space-y-1 text-xs text-teal-900 pt-1">
              {stay.houseRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
