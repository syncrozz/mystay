import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, User, Calendar, ChevronDown, Save } from 'lucide-react';
import { AgendaItem, TimeSlot, ActivityPriority, Stay } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG } from '../utils/constants';
import { toTitleCase, getDateForDay, getDayOptionsForStay, getDayContextLabel } from '../utils/formatters';

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

  const dayOptions = getDayOptionsForStay(stay);
  const selectedDateInfo = getDateForDay(stay.startDate, dayNumber);
  const selectedDayContext = dayNumber > 0 ? getDayContextLabel(stay, dayNumber) : null;

  return (
    <div id="activity-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="activity-modal-container"
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-7 space-y-5"
      >
        {/* Close Button */}
        <button
          id="activity-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {isEditing ? 'Edit Agenda' : 'Tambah Agenda'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Rancang aktiviti mengikut tarikh dan slot waktu tanpa terikat jadual jam yang ketat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* 1. Activity Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tajuk Agenda <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(toTitleCase(e.target.value))}
              placeholder="Cth: Pergi Pantai / Makan Nasi Dagang / Kenduri"
              className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* 2. DATE-FIRST AGENDA ASSIGNMENT */}
          <div className="space-y-3.5 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tarikh Agenda <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <div className="absolute left-3.5 top-3 text-teal-600 pointer-events-none">
                  <Calendar className="w-4 h-4" />
                </div>
                <select
                  id="activity-date-select"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(Number(e.target.value))}
                  className="w-full pl-10 pr-9 py-2.5 sm:py-3 text-sm sm:text-base bg-white border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 cursor-pointer appearance-none shadow-2xs"
                >
                  {dayOptions.map((opt) => (
                    <option key={opt.dayNumber} value={opt.dayNumber}>
                      {opt.dayNumber === 0
                        ? '📋 Belum Set (Perancangan)'
                        : `📅 ${opt.label} — ${opt.secondary}`}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Secondary Context & Day Number Badge */}
              {selectedDateInfo && dayNumber > 0 && selectedDayContext && (
                <div className="flex flex-wrap items-center gap-2 mt-2 px-0.5">
                  <span className="text-xs font-bold text-teal-900 bg-teal-100/90 border border-teal-300/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                    {selectedDateInfo.secondaryLabel}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                    {selectedDayContext.icon} {selectedDayContext.label}
                  </span>
                </div>
              )}
            </div>

            {/* 5 Primary Time of Day Blocks */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Slot Waktu
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['morning', 'midday', 'afternoon', 'evening', 'flexible'] as TimeSlot[]).map((slotKey) => {
                  const meta = TIME_SLOTS[slotKey];
                  const isSelected = timeSlot === slotKey;
                  return (
                    <button
                      key={slotKey}
                      type="button"
                      onClick={() => setTimeSlot(slotKey)}
                      className={`py-2 sm:py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? meta.activeButton
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-semibold'
                      }`}
                    >
                      <span className="text-lg sm:text-xl">{meta.icon}</span>
                      <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Secondary / Optional Details */}
          <div className="space-y-3.5 sm:space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Butiran Tambahan (Pilihan)
              </span>
            </div>

            {/* Specific Time & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masa Khusus (Pilihan)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={timeSpecific}
                    onChange={(e) => setTimeSpecific(e.target.value)}
                    placeholder="Cth: 9:00 pagi / Lepas Asar"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi / Tempat
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(toTitleCase(e.target.value))}
                    placeholder="Cth: Pasar Payang / Pantai"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Keutamaan Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? `${pConfig.badgeClass} ring-2 ring-teal-500/30 shadow-2xs`
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Orang Bertanggungjawab (PIC)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={personInCharge}
                  onChange={(e) => setPersonInCharge(toTitleCase(e.target.value))}
                  placeholder="Cth: Abang Long / Mak / Ayah"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {stay.companions && stay.companions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Pilih cepat:</span>
                  {stay.companions.map((comp) => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => setPersonInCharge(comp)}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Ringkas
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cth: Bungkus awal elak sesak / Bawa pakaian mandi"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
