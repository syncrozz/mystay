import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, User, Tag, Sparkles, Check, Save } from 'lucide-react';
import { AgendaItem, TimeSlot, ActivityPriority, Stay } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG } from '../utils/constants';
import { toTitleCase } from '../utils/formatters';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<AgendaItem, 'id'>) => void;
  initialItem?: AgendaItem | null;
  defaultDayNumber?: number;
  defaultTimeSlot?: TimeSlot;
  stay: Stay;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultDayNumber = 1,
  defaultTimeSlot = 'morning',
  stay
}) => {
  const isEditing = !!initialItem;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dayNumber, setDayNumber] = useState(defaultDayNumber);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(defaultTimeSlot);
  const [timeSpecific, setTimeSpecific] = useState('');
  const [priority, setPriority] = useState<ActivityPriority>('must_do');
  const [locationName, setLocationName] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setDescription(initialItem.description || '');
      setDayNumber(initialItem.dayNumber);
      setTimeSlot(initialItem.timeSlot);
      setTimeSpecific(initialItem.timeSpecific || '');
      setPriority(initialItem.priority);
      setLocationName(initialItem.locationName || '');
      setPersonInCharge(initialItem.personInCharge || '');
      setIsCompleted(initialItem.isCompleted || false);
    } else {
      setTitle('');
      setDescription('');
      setDayNumber(defaultDayNumber);
      setTimeSlot(defaultTimeSlot);
      setTimeSpecific('');
      setPriority('must_do');
      setLocationName('');
      setPersonInCharge('');
      setIsCompleted(false);
    }
  }, [initialItem, defaultDayNumber, defaultTimeSlot, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      stayId: stay.id,
      dayNumber,
      timeSlot,
      timeSpecific: timeSpecific.trim(),
      title: toTitleCase(title.trim()),
      description: description.trim(),
      priority,
      locationName: toTitleCase(locationName.trim()),
      personInCharge: toTitleCase(personInCharge.trim()),
      isCompleted
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id="activity-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="activity-modal-container"
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6"
      >
        {/* Close Button */}
        <button
          id="activity-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {isEditing ? 'Edit Agenda' : 'Tambah Agenda Stay'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Rancang aktiviti ringkas mengikut waktu (Pagi, Tengah Hari, Petang, Malam) tanpa terikat jadual jam yang ketat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Activity Title */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Tajuk Agenda <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(toTitleCase(e.target.value))}
              placeholder="Cth: Pergi Pantai / Makan Nasi Dagang / Sembang Kopi"
              className="w-full px-4 py-3 text-base bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-stone-900 placeholder:font-normal placeholder:text-stone-400 shadow-2xs"
            />
          </div>

          {/* 2. Day & Time of Day Selector */}
          <div className="space-y-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Waktu Hari
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500 font-medium">Hari:</span>
                <select
                  value={dayNumber}
                  onChange={(e) => setDayNumber(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg text-stone-800 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value={0}>📋 Belum Dijadualkan</option>
                  {Array.from({ length: stay.durationDays || 3 }).map((_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Hari {idx + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4 Primary Time of Day Blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['morning', 'midday', 'afternoon', 'evening'] as TimeSlot[]).map((slotKey) => {
                const meta = TIME_SLOTS[slotKey];
                const isSelected = timeSlot === slotKey;
                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => setTimeSlot(slotKey)}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs font-bold'
                        : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700 font-semibold'
                    }`}
                  >
                    <span className="text-xl">{meta.icon}</span>
                    <span className="text-[11px] sm:text-xs whitespace-nowrap">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Secondary / Optional Details */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Butiran Tambahan (Pilihan)
              </span>
            </div>

            {/* Specific Time & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Masa Khusus (Pilihan)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={timeSpecific}
                    onChange={(e) => setTimeSpecific(e.target.value)}
                    placeholder="Cth: 9:00 pagi / Lepas Asar"
                    className="w-full pl-10 pr-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Lokasi / Tempat
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(toTitleCase(e.target.value))}
                    placeholder="Cth: Pasar Payang / Pantai Teluk Ketapang"
                    className="w-full pl-10 pr-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Keutamaan Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Keutamaan
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(PRIORITY_CONFIG) as ActivityPriority[]).map((pKey) => {
                  const pConfig = PRIORITY_CONFIG[pKey];
                  const isSelected = priority === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setPriority(pKey)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? `${pConfig.badgeClass} ring-2 ring-amber-500/30 shadow-2xs`
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                      }`}
                    >
                      <p className="text-xs font-bold">{pConfig.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PIC (Person In Charge) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Orang Bertanggungjawab (PIC)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={personInCharge}
                  onChange={(e) => setPersonInCharge(toTitleCase(e.target.value))}
                  placeholder="Cth: Abang Long / Mak / Ayah"
                  className="w-full pl-10 pr-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {stay.companions && stay.companions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-stone-400">Pilih cepat:</span>
                  {stay.companions.map((comp) => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => setPersonInCharge(comp)}
                      className="px-2 py-0.5 text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Catatan Ringkas
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cth: Bungkus awal elak sesak / Bawa pakaian mandi"
                className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
