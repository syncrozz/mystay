import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Wifi, Phone, KeyRound, Users, Plus, Trash2, Check, FileText, Car, Home, Save, ArrowRight, Sparkles } from 'lucide-react';
import { Stay, StayType, DayType } from '../types';
import { STAY_TYPES, DAY_TYPE_CONFIG } from '../utils/constants';
import { getDayType, getStaySummaryCounts, getDayContextLabel, toTitleCase, getLocalTodayDate, getLocalDateWithOffset, getDateForDay } from '../utils/formatters';

// Helper to calculate difference in calendar days (inclusive of start & end day)
function getDaysDifference(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 1;
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const sDate = new Date(sy, sm - 1, sd);
  const eDate = new Date(ey, em - 1, ed);
  const diffMs = eDate.getTime() - sDate.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

function addDaysToDate(startDateStr: string, daysToAdd: number): string {
  if (!startDateStr) return '';
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const date = new Date(sy, sm - 1, sd + daysToAdd);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultDayTypes(totalDays: number): Record<number, DayType> {
  const result: Record<number, DayType> = {};
  for (let d = 1; d <= totalDays; d++) {
    result[d] = (d === 1 || (d === totalDays && totalDays >= 2)) ? 'travel_day' : 'stay_day';
  }
  return result;
}

interface CreateEditStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: (stayId: string) => void;
  initialStay?: Stay | null;
}

export const CreateEditStayModal: React.FC<CreateEditStayModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialStay
}) => {
  const isEditing = !!initialStay;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<StayType>('balik_kampung');
  const [durationDays, setDurationDays] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [address, setAddress] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostContact, setHostContact] = useState('');
  const [gatePin, setGatePin] = useState('');
  const [importantNotes, setImportantNotes] = useState('');
  const [companionInput, setCompanionInput] = useState('');
  const [companions, setCompanions] = useState<string[]>([]);
  const [ruleInput, setRuleInput] = useState('');
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [dayTypes, setDayTypes] = useState<Record<number, DayType>>({});
  const [activeTab, setActiveTab] = useState<'quick' | 'stay_info' | 'companions'>('quick');

  useEffect(() => {
    if (initialStay) {
      setTitle(initialStay.title);
      setType(initialStay.type);
      const totalD = initialStay.durationDays || 3;
      setDurationDays(totalD);
      setStartDate(initialStay.startDate || '');
      setEndDate(initialStay.endDate || '');
      setAddress(initialStay.address || '');
      setWifiSsid(initialStay.wifiSsid || '');
      setWifiPassword(initialStay.wifiPassword || '');
      setHostName(initialStay.hostName || '');
      setHostContact(initialStay.hostContact || '');
      setGatePin(initialStay.gatePin || '');
      setImportantNotes(initialStay.importantNotes || '');
      setCompanions(initialStay.companions || []);
      setHouseRules(initialStay.houseRules || []);

      const initialDayTypes: Record<number, DayType> = {};
      for (let d = 1; d <= totalD; d++) {
        if (initialStay.dayTypes && initialStay.dayTypes[d]) {
          initialDayTypes[d] = initialStay.dayTypes[d];
        } else {
          initialDayTypes[d] = (d === 1 || (d === totalD && totalD >= 2)) ? 'travel_day' : 'stay_day';
        }
      }
      setDayTypes(initialDayTypes);
      setActiveTab('quick');
    } else {
      setTitle('');
      setType('balik_kampung');
      const defaultDuration = 3;
      setDurationDays(defaultDuration);
      const today = getLocalTodayDate();
      setStartDate(today);
      const end = getLocalDateWithOffset(defaultDuration - 1, today);
      setEndDate(end);
      setAddress('');
      setWifiSsid('');
      setWifiPassword('');
      setHostName('');
      setHostContact('');
      setGatePin('');
      setImportantNotes('');
      setCompanions([]);
      setHouseRules([]);
      setDayTypes({
        1: 'travel_day',
        2: 'stay_day',
        3: 'travel_day'
      });
      setActiveTab('quick');
    }
  }, [initialStay, isOpen]);

  const handleStartDateChange = (dateVal: string) => {
    setStartDate(dateVal);
    if (dateVal) {
      if (endDate && endDate >= dateVal) {
        const days = getDaysDifference(dateVal, endDate);
        setDurationDays(days);
        setDayTypes(getDefaultDayTypes(days));
      } else {
        const newEnd = addDaysToDate(dateVal, durationDays - 1);
        setEndDate(newEnd);
        setDayTypes(getDefaultDayTypes(durationDays));
      }
    }
  };

  const handleEndDateChange = (dateVal: string) => {
    setEndDate(dateVal);
    if (dateVal) {
      if (startDate && dateVal >= startDate) {
        const days = getDaysDifference(startDate, dateVal);
        setDurationDays(days);
        setDayTypes(getDefaultDayTypes(days));
      } else {
        setStartDate(dateVal);
        setDurationDays(1);
        setDayTypes(getDefaultDayTypes(1));
      }
    }
  };

  const handleDurationChange = (days: number) => {
    const validDays = Math.max(1, days);
    setDurationDays(validDays);
    if (startDate) {
      const end = addDaysToDate(startDate, validDays - 1);
      setEndDate(end);
    }
    setDayTypes(getDefaultDayTypes(validDays));
  };

  const toggleDayType = (dayNumber: number) => {
    setDayTypes((prev) => {
      const current = prev[dayNumber] || ((dayNumber === 1 || (dayNumber === durationDays && durationDays >= 2)) ? 'travel_day' : 'stay_day');
      return {
        ...prev,
        [dayNumber]: current === 'travel_day' ? 'stay_day' : 'travel_day'
      };
    });
  };

  const handleAddCompanion = () => {
    if (companionInput.trim()) {
      setCompanions([...companions, toTitleCase(companionInput.trim())]);
      setCompanionInput('');
    }
  };

  const handleRemoveCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const handleAddRule = () => {
    if (ruleInput.trim()) {
      setHouseRules([...houseRules, toTitleCase(ruleInput.trim())]);
      setRuleInput('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setHouseRules(houseRules.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const effectiveStart = startDate || getLocalTodayDate();
    const effectiveEnd = addDaysToDate(effectiveStart, durationDays - 1);

    // Prune dayTypes for any days > durationDays
    const cleanedDayTypes: Record<number, DayType> = {};
    for (let d = 1; d <= durationDays; d++) {
      cleanedDayTypes[d] = dayTypes[d] || ((d === 1 || (d === durationDays && durationDays >= 2)) ? 'travel_day' : 'stay_day');
    }

    onSave({
      title: toTitleCase(title.trim()),
      type,
      durationDays,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      location: '',
      address: address.trim(),
      wifiSsid: wifiSsid.trim(),
      wifiPassword: wifiPassword.trim(),
      hostName: toTitleCase(hostName.trim()),
      hostContact: hostContact.trim(),
      gatePin: gatePin.trim(),
      importantNotes: importantNotes.trim(),
      companions,
      houseRules,
      dayTypes: cleanedDayTypes
    });

    onClose();
  };

  const currentSummary = getStaySummaryCounts({ durationDays, dayTypes });

  if (!isOpen) return null;

  return (
    <div id="stay-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="stay-modal-container"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-7 space-y-5"
      >
        {/* Close Button */}
        <button
          id="stay-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {isEditing ? 'Kemaskini Rancangan' : 'Rancang Perjalanan Baharu'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isEditing ? 'Ubah maklumat dan tetapan percutian anda.' : 'Cipta pantas dengan maklumat asas — butiran lanjut boleh dilengkapkan bila-bila masa.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-1 sm:gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'quick'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isEditing ? 'Maklumat Asas' : '1. Cipta Pantas (Wajib)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stay_info')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'stay_info'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isEditing ? 'Info Penginapan & Wi-Fi' : '2. Info Homestay & Wi-Fi (Pilihan)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('companions')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'companions'
                ? 'border-teal-600 text-teal-950 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ahli / Tetamu {companions.length > 0 ? `(${companions.length})` : ''}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* TAB 1: QUICK CREATE (SES v4.5 Step 1) */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              {/* Stay Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Rancangan / Percutian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(toTitleCase(e.target.value))}
                  placeholder="Cth: Percutian Santai Cameron Highlands / Balik Raya Muar"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 shadow-2xs"
                />
              </div>

              {/* Date Pickers (Tarikh Mula & Tarikh Akhir) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tarikh Mula <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold text-slate-800 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tarikh Akhir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold text-slate-800 cursor-pointer"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-700">
                    Tempoh: <span className="text-teal-700">{durationDays} Hari</span> ({Math.max(0, durationDays - 1)} Malam)
                  </span>
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDurationChange(d)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          durationDays === d
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        {d}H
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stay Type Selection (Pilihan Ringkas) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Kategori Perjalanan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(STAY_TYPES) as StayType[]).map((tKey) => {
                    const item = STAY_TYPES[tKey];
                    const isSelected = type === tKey;
                    return (
                      <button
                        key={tKey}
                        id={`stay-type-btn-${tKey}`}
                        type="button"
                        onClick={() => setType(tKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-400/20 text-teal-950 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs">{item.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Types overview */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950">
                    Konfigurasi Hari: {currentSummary.stayDaysCount} Hari Stay · {currentSummary.travelDaysCount} Hari Perjalanan
                  </span>
                  <span className="text-[11px] text-teal-800">Klik untuk ubah jenis hari</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: durationDays }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const isTravel = (dayTypes[dayNum] || (dayNum === 1 || (dayNum === durationDays && durationDays >= 2) ? 'travel_day' : 'stay_day')) === 'travel_day';
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => toggleDayType(dayNum)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isTravel
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : 'bg-teal-100 text-teal-950 border-teal-300'
                        }`}
                      >
                        {isTravel ? '🚗' : '🏠'} H{dayNum} ({isTravel ? 'Travel' : 'Stay'})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fast-path helper notice for Step 1 */}
              {!isEditing && (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center justify-between gap-2">
                  <span>💡 Maklumat Wi-Fi, kunci, dan ahli keluarga boleh ditambah kemudian.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stay_info')}
                    className="text-teal-700 font-bold hover:underline shrink-0"
                  >
                    Isi sekarang →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STAY INFO & SENSITIVE DETAILS (SES v4.5 Step 2) */}
          {activeTab === 'stay_info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Penuh Penginapan
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cth: No 24, Jalan Kenanga, 84000 Muar, Johor"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Wi-Fi Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Wifi className="w-4 h-4 text-teal-600" />
                  <span>Maklumat Wi-Fi Penginapan (Pilihan)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Wi-Fi (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="Cth: Homestay_WiFi_5G"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kata Laluan Wi-Fi</label>
                    <input
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="Cth: password1234"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Host & Smartlock Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Tuan Rumah / Host
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(toTitleCase(e.target.value))}
                    placeholder="Cth: En. Firdaus / Tok Wan"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. Telefon Host / Bantuan
                  </label>
                  <input
                    type="text"
                    value={hostContact}
                    onChange={(e) => setHostContact(e.target.value)}
                    placeholder="Cth: +6012-3456789"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              {/* Smartlock PIN / Gate Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kod Smartlock / Lokasi Kunci
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={gatePin}
                    onChange={(e) => setGatePin(e.target.value)}
                    placeholder="Cth: #4829# atau Kunci dalam masterlock kod 1234"
                    className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Notes & House Rules */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nota Khas & Peraturan Penginapan
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ruleInput}
                    onChange={(e) => setRuleInput(toTitleCase(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                    placeholder="Cth: Check-out pukul 12 PM / Jangan buang sampah dlm mangkuk tandas"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800 rounded-xl cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>
                {houseRules.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {houseRules.map((rule, idx) => (
                      <li key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span>• {rule}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(idx)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMPANIONS */}
          {activeTab === 'companions' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senarai Ahli Keluarga / Tetamu yang Terlibat
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Mudah untuk menetapkan siapa yang bertanggungjawab (PIC) bagi aktiviti atau makanan tertentu.
                </p>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={companionInput}
                    onChange={(e) => setCompanionInput(toTitleCase(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCompanion();
                      }
                    }}
                    placeholder="Cth: Mak & Ayah / Abang Long / Cucu-cucu"
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddCompanion}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {companions.map((comp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-xs font-medium text-slate-800"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{comp}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompanion(idx)}
                        className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {companions.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Belum ada ahli ditambah.</p>
                  )}
                </div>
              </div>

              {/* Quick companion presets */}
              <div className="pt-3 border-t border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cadangan Pantas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Mak & Ayah', 'Tok Wan & Tok Mak', 'Anak-anak', 'Adik-beradik', 'Keluarga Mertua'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        if (!companions.includes(preset)) {
                          setCompanions([...companions, preset]);
                        }
                      }}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              {isEditing && onDelete && initialStay ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Adakah anda pasti mahu memadam "${initialStay.title}"? Semua jadual dan semakan akan dipadamkan daripada Cloud.`)) {
                      onDelete(initialStay.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Padam Trip</span>
                </button>
              ) : activeTab === 'quick' && !isEditing ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('stay_info')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Tambah Info Lanjut →
                </button>
              ) : activeTab !== 'quick' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('quick')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Kembali ke Asas
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Simpan & Mula Rancang'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
