import { StayType, ActivityPriority, TimeSlot, ChecklistCategory } from '../types';

export const ASSETS = {
  LOGO: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/MyStay/android-chrome-192x192.png',
  LOGO_512: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/MyStay/android-chrome-512x512.png',
  APPLE_TOUCH_ICON: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/MyStay/apple-touch-icon.png',
  FAVICON_SVG: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/MyStay/favicon.svg',
  FAVICON_ICO: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/MyStay/favicon.ico',
  OGI: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/MyStay/OGI.MyStay.jpg',
  QR_SUPPORT: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/Bank%20QR/QR%20RYT%20for%20Sumbangan.jpg'
};

export const STAY_TYPES: Record<StayType, { label: string; icon: string; desc: string; defaultDays: number; color: string }> = {
  balik_kampung: {
    label: 'Balik Kampung',
    icon: '🏡',
    desc: 'Ziarah keluarga, rumah orang tua / sanak saudara',
    defaultDays: 3,
    color: 'teal'
  },
  family_stay: {
    label: 'Family Short Stay',
    icon: '👨‍👩‍👧‍👦',
    desc: 'Bercuti bersama keluarga besar atau anak-anak',
    defaultDays: 3,
    color: 'emerald'
  },
  guest_hosting: {
    label: 'Tetamu Menginap',
    icon: '🤝',
    desc: 'Menyambut & melayan tetamu di rumah sendiri',
    defaultDays: 2,
    color: 'cyan'
  },
  homestay: {
    label: 'Homestay / Airbnb',
    icon: '🏖️',
    desc: 'Menginap di homestay, villa atau chalet sewa',
    defaultDays: 3,
    color: 'sky'
  },
  weekend_getaway: {
    label: 'Weekend Getaway',
    icon: '🎒',
    desc: 'Percutian santai hujung minggu 2–3 hari',
    defaultDays: 2,
    color: 'indigo'
  },
  short_trip: {
    label: 'Short Trip / Transit',
    icon: '🚗',
    desc: 'Singgah kerja, transit kenduri atau urusan penting',
    defaultDays: 2,
    color: 'slate'
  },
  custom: {
    label: 'Kustom / Lain-lain',
    icon: '✨',
    desc: 'Perancangan tinggal singkat mengikut citarasa',
    defaultDays: 3,
    color: 'teal'
  }
};

export const PRIORITY_CONFIG: Record<ActivityPriority, {
  label: string;
  shortLabel: string;
  badgeClass: string;
  borderClass: string;
  bgLight: string;
  iconName: string;
  description: string;
}> = {
  must_do: {
    label: 'Wajib',
    shortLabel: 'Wajib',
    badgeClass: 'bg-teal-100 text-teal-950 border-teal-300 font-semibold',
    borderClass: 'border-l-4 border-l-teal-600',
    bgLight: 'bg-teal-50/70',
    iconName: 'Star',
    description: 'Aktiviti utama & penting (Mesti buat dalam stay ini)'
  },
  optional: {
    label: 'Santai',
    shortLabel: 'Santai',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    borderClass: 'border-l-4 border-l-emerald-500',
    bgLight: 'bg-emerald-50/50',
    iconName: 'Palmtree',
    description: 'Sekadar pilihan (Boleh ganti jika tak sempat atau penat)'
  },
  food: {
    label: 'Makan',
    shortLabel: 'Makan',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    borderClass: 'border-l-4 border-l-amber-500',
    bgLight: 'bg-amber-50/50',
    iconName: 'Utensils',
    description: 'Sarapan, makan tengah hari, minum petang & makan malam'
  },
  rest: {
    label: 'Rehat',
    shortLabel: 'Rehat',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    borderClass: 'border-l-4 border-l-indigo-400',
    bgLight: 'bg-indigo-50/40',
    iconName: 'Coffee',
    description: 'Waktu santai rehatkan badan & luang masa tanpa terkejar'
  },
  logistics: {
    label: 'Perjalanan',
    shortLabel: 'Perjalanan',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    borderClass: 'border-l-4 border-l-slate-400',
    bgLight: 'bg-slate-50',
    iconName: 'Car',
    description: 'Perjalanan, check-in, kemas bagasi & persediaan'
  }
};

export const TIME_SLOTS: Record<TimeSlot, { label: string; icon: string; bgBadge: string }> = {
  morning: {
    label: 'Pagi',
    icon: '🌅',
    bgBadge: 'bg-teal-100/80 text-teal-950 border-teal-200'
  },
  midday: {
    label: 'Tengah Hari',
    icon: '☀️',
    bgBadge: 'bg-sky-100/80 text-sky-950 border-sky-200'
  },
  afternoon: {
    label: 'Petang',
    icon: '🌤️',
    bgBadge: 'bg-cyan-100/80 text-cyan-950 border-cyan-200'
  },
  evening: {
    label: 'Malam',
    icon: '🌙',
    bgBadge: 'bg-indigo-100/80 text-indigo-950 border-indigo-200'
  },
  flexible: {
    label: 'Fleksibel',
    icon: '🍃',
    bgBadge: 'bg-emerald-100/80 text-emerald-950 border-emerald-200'
  }
};

export const CHECKLIST_CATEGORIES: Record<ChecklistCategory, { label: string; icon: string }> = {
  essentials: { label: 'Barang Wajib & Dokumen', icon: '🪪' },
  house_homestay: { label: 'Keperluan Homestay & Rumah', icon: '🏠' },
  food_gifts: { label: 'Buah Tangan & Makanan', icon: '🎁' },
  kids_elderly: { label: 'Anak Kecil & Warga Emas', icon: '👶' },
  custom: { label: 'Lain-lain', icon: '📝' }
};

export const DAY_TYPE_CONFIG = {
  travel_day: {
    label: 'Hari Perjalanan',
    shortLabel: 'Perjalanan',
    icon: '🚗',
    badgeClass: 'bg-sky-100 text-sky-950 border-sky-200/80',
    cardBorder: 'border-sky-200 hover:border-sky-300',
    headerBg: 'bg-sky-50/70',
    tagBg: 'bg-sky-100/90 text-sky-950 border-sky-300/80 font-bold',
    description: 'Hari bertolak atau perjalanan pulang (fokus logistik santai & rehat jalanan)'
  },
  stay_day: {
    label: 'Hari Penginapan (Aktiviti)',
    shortLabel: 'Stay Day',
    icon: '🏠',
    badgeClass: 'bg-teal-100 text-teal-950 border-teal-200/80',
    cardBorder: 'border-slate-200 hover:border-teal-300',
    headerBg: 'bg-slate-50/90',
    tagBg: 'bg-teal-100/90 text-teal-950 border-teal-300/80 font-bold',
    description: 'Hari penginapan penuh untuk aktiviti, silaturahim, makan santai & santai'
  }
};

