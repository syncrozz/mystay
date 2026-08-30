import React, { useState } from 'react';
import { Stay } from '../types';
import { useAuth } from '../context/AuthContext';
import { MapPin, Wifi, Phone, KeyRound, Copy, Check, ExternalLink, Home, FileText } from 'lucide-react';

interface StayInfoCardProps {
  stay: Stay;
  onEditStay: () => void;
}

export const StayInfoCard: React.FC<StayInfoCardProps> = ({ stay, onEditStay }) => {
  const { requireAdmin } = useAuth();
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCopyWifi = () => {
    if (stay.wifiPassword) {
      navigator.clipboard.writeText(stay.wifiPassword);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2000);
    }
  };

  const handleCopyAddress = () => {
    const textToCopy = stay.address || stay.location;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleEditClick = () => {
    requireAdmin(() => {
      onEditStay();
    }, 'Sila sahkan PIN Admin untuk mengedit maklumat penginapan.');
  };

  const mapsQuery = encodeURIComponent(stay.address || stay.location);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const wazeUrl = `https://waze.com/ul?q=${mapsQuery}`;

  return (
    <div id="stay-info-card" className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
            <Home className="w-5 h-5" />
          </span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Maklumat Stay</h3>
        </div>
        <button
          onClick={handleEditClick}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
        >
          Edit Maklumat
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Address & Navigation */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Alamat & Lokasi
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
            {stay.address || stay.location || 'Lokasi belum ditetapkan'}
          </p>
          {(stay.address || stay.location) && (
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

        {/* Wi-Fi Details */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-slate-500" />
              Wi-Fi Penginapan
            </span>
            {stay.wifiPassword && (
              <button
                onClick={handleCopyWifi}
                className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedWifi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedWifi ? 'Password Disalin' : 'Salin Password'}
              </button>
            )}
          </div>
          {stay.wifiSsid ? (
            <div className="text-xs space-y-1">
              <p className="text-slate-600">
                SSID: <strong className="text-slate-900 font-mono font-bold">{stay.wifiSsid}</strong>
              </p>
              <p className="text-slate-600">
                Password: <strong className="text-slate-900 font-mono font-bold">{stay.wifiPassword || '(Tiada password)'}</strong>
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Tiada maklumat Wi-Fi dimasukkan.</p>
          )}
        </div>

        {/* Host Contact */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            Host / Bantuan Kecemasan
          </span>
          {stay.hostContact ? (
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-bold text-slate-900">{stay.hostName || 'Tuan Rumah'}</p>
                <p className="text-xs text-slate-600 font-mono">{stay.hostContact}</p>
              </div>
              <a
                href={`tel:${stay.hostContact.replace(/[^0-9+]/g, '')}`}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                Panggil
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Tiada nombor hubungan dimasukkan.</p>
          )}
        </div>

        {/* Gate Pin & Key */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            Kunci & Kod Smartlock
          </span>
          <p className="text-xs text-slate-800 font-medium font-mono pt-1">
            {stay.gatePin || 'Tiada kod atau info kunci khas.'}
          </p>
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
