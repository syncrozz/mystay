import { Stay, AgendaItem, ChecklistItem, DayType, TimeSlot } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG, DAY_TYPE_CONFIG } from './constants';

/**
 * Returns today's local date string in YYYY-MM-DD format based on the user's local timezone.
 */
export function getLocalTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a local date string in YYYY-MM-DD offset by daysToAdd from a given date or today.
 */
export function getLocalDateWithOffset(daysToAdd: number = 0, baseDateStr?: string): string {
  let baseDate: Date;
  if (baseDateStr) {
    const [y, m, d] = baseDateStr.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  } else {
    baseDate = new Date();
  }
  baseDate.setDate(baseDate.getDate() + daysToAdd);
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns day type ('travel_day' | 'stay_day') for a given 1-based day number.
 * Default rule:
 * - Start day (1) = travel_day
 * - End day (durationDays) = travel_day (if durationDays >= 2)
 * - Intermediate days = stay_day
 * User custom override in stay.dayTypes[dayNumber] takes precedence.
 */
export function getDayType(stay: Partial<Stay>, dayNumber: number): DayType {
  if (stay.dayTypes && stay.dayTypes[dayNumber]) {
    return stay.dayTypes[dayNumber];
  }
  const total = stay.durationDays || 3;
  if (dayNumber === 1) return 'travel_day';
  if (dayNumber === total && total >= 2) return 'travel_day';
  return 'stay_day';
}

/**
 * Calculates Stay summary stats:
 * Total Days, Nights, Activity/Stay Days count, and Travel Days count.
 */
export function getStaySummaryCounts(stay: Partial<Stay>) {
  const totalDays = stay.durationDays || 1;
  const nights = Math.max(0, totalDays - 1);
  let stayDaysCount = 0;
  let travelDaysCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const t = getDayType(stay, d);
    if (t === 'stay_day') stayDaysCount++;
    else travelDaysCount++;
  }

  return {
    totalDays,
    nights,
    stayDaysCount,
    travelDaysCount
  };
}

/**
 * Generates descriptive stay summary, e.g.:
 * "5 Hari · 4 Malam · 3 Hari Aktiviti" or "3 Hari · 2 Malam · 1 Hari Aktiviti"
 */
export function formatStaySummary(stay: Partial<Stay>): string {
  const { totalDays, nights, stayDaysCount } = getStaySummaryCounts(stay);
  const parts: string[] = [`${totalDays} Hari`];
  if (nights > 0) parts.push(`${nights} Malam`);
  if (stayDaysCount > 0) parts.push(`${stayDaysCount} Hari Aktiviti`);
  return parts.join(' · ');
}

/**
 * Helper to safely parse a YYYY-MM-DD or date string without timezone skew.
 */
export function parseDateString(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[-/]/).map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    if (parts[0] >= 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    if (parts[2] >= 1000) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns date information for a specific dayNumber (1-based index) of a stay.
 */
export function getDateForDay(startDateStr: string | undefined, dayNumber: number) {
  if (dayNumber === 0) {
    return {
      dayNumber: 0,
      fullDateString: '',
      dateFormatted: 'Belum Set',
      dayName: '',
      dayNameFull: '',
      dayOfMonth: '',
      monthShort: '',
      monthLong: '',
      year: 0,
      displayLabel: '📋 Belum Set',
      secondaryLabel: ''
    };
  }

  // Gracefully fallback to today if startDateStr is absent or invalid
  const baseDate = parseDateString(startDateStr) || parseDateString(getLocalTodayDate()) || new Date();

  const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + (dayNumber - 1));
  const dayName = targetDate.toLocaleDateString('ms-MY', { weekday: 'short' });
  const dayNameFull = targetDate.toLocaleDateString('ms-MY', { weekday: 'long' });
  const dayOfMonth = targetDate.getDate().toString();
  const monthShort = targetDate.toLocaleDateString('ms-MY', { month: 'short' });
  const monthLong = targetDate.toLocaleDateString('ms-MY', { month: 'long' });
  const year = targetDate.getFullYear();

  const dateFormatted = `${dayOfMonth} ${monthShort}`;
  const displayLabel = `${dayOfMonth} ${monthShort}`;
  const secondaryLabel = `Hari ${dayNumber}`;

  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const fullDateString = `${year}-${m}-${d}`;

  return {
    dayNumber,
    fullDateString,
    dateFormatted,
    dayName,
    dayNameFull,
    dayOfMonth,
    monthShort,
    monthLong,
    year,
    displayLabel,
    secondaryLabel
  };
}

/**
 * Converts a calendar date string (YYYY-MM-DD) into its 1-based dayNumber offset from startDate.
 */
export function getDayNumberFromDate(startDateStr: string | undefined, selectedDateStr: string): number {
  if (!startDateStr || !selectedDateStr) return 1;
  const start = parseDateString(startDateStr);
  const selected = parseDateString(selectedDateStr);
  if (!start || !selected) return 1;

  const diffTime = selected.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export interface DayOption {
  dayNumber: number;
  label: string;
  secondary: string;
  dateFormatted: string;
  dateIso: string;
  contextIcon: string;
  contextLabel: string;
}

/**
 * Returns clean day options for date-first selectors in Activity Modal and other controls.
 */
export function getDayOptionsForStay(stay: Partial<Stay>): DayOption[] {
  const duration = stay.durationDays || 3;
  const options: DayOption[] = [
    {
      dayNumber: 0,
      label: 'Belum Set',
      secondary: 'Perancangan / Backlog',
      dateFormatted: 'Belum Set',
      dateIso: '',
      contextIcon: '📋',
      contextLabel: 'Belum Set'
    }
  ];

  for (let d = 1; d <= duration; d++) {
    const dateInfo = getDateForDay(stay.startDate, d);
    const context = getDayContextLabel(stay, d);

    options.push({
      dayNumber: d,
      label: dateInfo.displayLabel,
      secondary: `${dateInfo.secondaryLabel} (${context.label})`,
      dateFormatted: dateInfo.dateFormatted,
      dateIso: dateInfo.fullDateString,
      contextIcon: context.icon,
      contextLabel: context.label
    });
  }

  return options;
}

/**
 * Generates contextual day badge label:
 * e.g.
 * Day 1 (Travel): "🚗 Perjalanan"
 * Day 2..N-1 (Stay): "🏠 Stay"
 * Day N (Return Travel): "🚗 Perjalanan Balik"
 */
export function getDayContextLabel(stay: Partial<Stay>, dayNumber: number): {
  type: DayType;
  label: string;
  shortLabel: string;
  icon: string;
} {
  const type = getDayType(stay, dayNumber);
  const total = stay.durationDays || 1;

  if (type === 'travel_day') {
    if (dayNumber === total && total >= 2) {
      return {
        type: 'travel_day',
        label: 'Perjalanan Balik',
        shortLabel: 'Perjalanan Balik',
        icon: '🚗'
      };
    }
    return {
      type: 'travel_day',
      label: 'Perjalanan',
      shortLabel: 'Perjalanan',
      icon: '🚗'
    };
  }

  return {
    type: 'stay_day',
    label: 'Stay',
    shortLabel: 'Stay',
    icon: '🏠'
  };
}

export function formatDateRange(startDateStr?: string, endDateStr?: string, durationDays: number = 3): string {
  const effectiveStart = startDateStr || getLocalTodayDate();
  try {
    const start = parseDateString(effectiveStart) || new Date();
    const startFormatted = start.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
    const effectiveDuration = Math.max(1, durationDays || 1);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (effectiveDuration - 1));
    const endFormatted = end.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startFormatted} – ${endFormatted} (${effectiveDuration} Hari ${effectiveDuration > 1 ? `${effectiveDuration - 1} Malam` : ''})`;
  } catch {
    return `${durationDays} Hari`;
  }
}

export function generateWhatsAppMessage(
  stay: Stay,
  agendaItems: AgendaItem[],
  checklistItems?: ChecklistItem[],
  includeSensitiveInfo: boolean = false
): string {
  const stayAgendas = agendaItems.filter((a) => a.stayId === stay.id);

  let msg = `🌟 *STAYPLAN: ${stay.title.toUpperCase()}*\n`;
  msg += `_"Smart stays, kept on track."_\n\n`;

  if (stay.location) msg += `📍 *Lokasi:* ${stay.location}\n`;
  if (stay.address) msg += `🗺️ *Alamat:* ${stay.address}\n`;
  msg += `📅 *Tempoh:* ${formatDateRange(stay.startDate, stay.endDate, stay.durationDays)}\n`;

  if (stay.companions && stay.companions.length > 0) {
    msg += `👥 *Bersama:* ${stay.companions.join(', ')}\n`;
  }

  if (stay.wifiSsid) {
    if (includeSensitiveInfo && stay.wifiPassword) {
      msg += `📶 *WiFi:* ${stay.wifiSsid} (Kata laluan: ${stay.wifiPassword})\n`;
    } else {
      msg += `📶 *WiFi:* ${stay.wifiSsid}\n`;
    }
  }

  if (stay.hostContact) {
    msg += `📞 *Hubungi:* ${stay.hostName ? `${stay.hostName} ` : ''}(${stay.hostContact})\n`;
  }

  msg += `\n═══════════════════════\n`;
  msg += `   📋 *AGENDA & HARI PERJALANAN*   \n`;
  msg += `═══════════════════════\n`;

  const slotOrderRank: Record<TimeSlot, number> = {
    morning: 1,
    midday: 2,
    afternoon: 3,
    evening: 4,
    flexible: 5
  };

  const effectiveStartDate =
    stay.startDate && parseDateString(stay.startDate)
      ? stay.startDate
      : getLocalTodayDate();

  const totalDays = Math.max(1, stay.durationDays || 2);

  for (let day = 1; day <= totalDays; day++) {
    const dayItems = stayAgendas.filter((a) => a.dayNumber === day);
    const dayContext = getDayContextLabel(stay, day);
    const dateInfo = getDateForDay(effectiveStartDate, day);
    const fullDateStr = `${dateInfo.dayNameFull}, ${dateInfo.dayOfMonth} ${dateInfo.monthShort}`;

    msg += `\n📌 *HARI ${day}: ${fullDateStr} (${dayContext.icon} ${dayContext.label})*\n\n`;

    if (dayItems.length === 0) {
      msg += `_(Tiada aktiviti dirancang lagi)_\n───────────────────────\n`;
      continue;
    }

    const sortedDayItems = [...dayItems].sort((a, b) => {
      const slotDiff = (slotOrderRank[a.timeSlot] || 5) - (slotOrderRank[b.timeSlot] || 5);
      if (slotDiff !== 0) return slotDiff;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    sortedDayItems.forEach((item) => {
      const statusIcon = item.isCompleted ? '✅' : '*';
      const timeStr = item.timeSpecific ? ` (${item.timeSpecific})` : '';
      const locStr = item.locationName ? ` 📍 ${item.locationName}` : '';
      const picStr = item.personInCharge ? ` [PIC: ${item.personInCharge}]` : '';

      msg += `${statusIcon} ${item.title}${timeStr}${locStr}${picStr}\n`;
      if (item.description) {
        msg += `   _${item.description}_\n`;
      }
    });

    msg += `───────────────────────\n`;
  }

  if (stay.importantNotes || (stay.houseRules && stay.houseRules.length > 0) || (includeSensitiveInfo && stay.gatePin)) {
    msg += `\n💡 *NOTA PENTING & PERATURAN:*\n`;
    if (includeSensitiveInfo && stay.gatePin) {
      msg += `🔑 *Kunci/PIN Akses:* ${stay.gatePin}\n`;
    }
    if (stay.importantNotes) msg += `• ${stay.importantNotes}\n`;
    if (stay.houseRules) {
      stay.houseRules.forEach((rule) => {
        msg += `• ${rule}\n`;
      });
    }
  }

  msg += `\n📱 _Disediakan melalui StayPlan_`;

  return msg;
}

/**
 * Automatically converts text to Title Case in a non-destructive manner:
 * - Capitalizes the first letter of each word.
 * - If user intentionally includes uppercase characters (e.g. acronyms like DIY, KFC, KPMBP,
 *   or camelCase like McD, iPhone, eWallet), preserves existing capitalization.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';

  return str.replace(/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+/g, (word) => {
    // If the word contains uppercase characters after the first character, preserve as-is (e.g. DIY, KFC, iPhone, McD)
    if (word.slice(1) !== word.slice(1).toLowerCase()) {
      return word;
    }
    // Otherwise capitalize the first letter and keep the rest
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}

/**
 * Helper function to parse single-line or multiline paste text into clean activity titles.
 * - Splits multiline input into individual lines
 * - Trims whitespace and ignores blank lines
 * - Strips numbered list markers (e.g. 1., 2), 3 -) and bullets (e.g. -, *, •, –, —)
 * - Converts each title to Title Case
 */
export function parseActivityLines(rawText: string): string[] {
  if (!rawText) return [];
  const lines = rawText.split(/\r?\n/);
  const results: string[] = [];

  for (const line of lines) {
    const cleaned = line
      .trim()
      .replace(/^(\d+[\.\)]\s*|[-*•–—]\s*)+/, '')
      .trim();

    if (cleaned) {
      results.push(toTitleCase(cleaned));
    }
  }

  return results;
}

export const TIME_SLOT_HIERARCHY: Record<TimeSlot, number> = {
  morning: 1,
  midday: 2,
  afternoon: 3,
  evening: 4,
  flexible: 5
};

/**
 * Returns current time slot ('morning', 'midday', 'afternoon', 'evening') based on current hour.
 * - 05:00 – 11:59: morning (Pagi)
 * - 12:00 – 14:29: midday (Tengah Hari)
 * - 14:30 – 18:59: afternoon (Petang)
 * - 19:00 – 04:59: evening (Malam)
 */
export function getCurrentTimeSlot(now: Date = new Date()): TimeSlot {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes >= 300 && totalMinutes < 720) {
    return 'morning';
  }
  if (totalMinutes >= 720 && totalMinutes < 870) {
    return 'midday';
  }
  if (totalMinutes >= 870 && totalMinutes < 1140) {
    return 'afternoon';
  }
  return 'evening';
}

/**
 * Determines whether an agenda item's slot falls on the current slot or subsequent slots.
 * Flexible items are always included.
 */
export function isSlotOnward(slot: TimeSlot, currentSlot: TimeSlot): boolean {
  if (slot === 'flexible') return true;
  const currentRank = TIME_SLOT_HIERARCHY[currentSlot] || 1;
  const slotRank = TIME_SLOT_HIERARCHY[slot] || 1;
  return slotRank >= currentRank;
}

export function getTimeSlotLabel(slot: TimeSlot): { label: string; icon: string; timeRange: string } {
  switch (slot) {
    case 'morning':
      return { label: 'Pagi', icon: '🌅', timeRange: '5:00 AM – 11:59 AM' };
    case 'midday':
      return { label: 'Tengah Hari', icon: '☀️', timeRange: '12:00 PM – 2:30 PM' };
    case 'afternoon':
      return { label: 'Petang', icon: '🌤️', timeRange: '2:30 PM – 7:00 PM' };
    case 'evening':
      return { label: 'Malam', icon: '🌙', timeRange: '7:00 PM – Lewat Malam' };
    case 'flexible':
    default:
      return { label: 'Fleksibel', icon: '🍃', timeRange: 'Bila-bila masa' };
  }
}

export interface TodayStayDayInfo {
  todayStr: string;
  dayNumber: number; // 1-based index (capped between 1 and duration)
  isTodayInStay: boolean;
  isBeforeStay: boolean;
  isAfterStay: boolean;
  currentSlot: TimeSlot;
  currentSlotInfo: { label: string; icon: string; timeRange: string };
  todayFormatted: string;
  dayContext: ReturnType<typeof getDayContextLabel>;
  dateInfo: ReturnType<typeof getDateForDay>;
}

/**
 * Computes live contextual stay day information for today's date.
 */
export function getTodayStayDayInfo(stay: Partial<Stay>, now: Date = new Date()): TodayStayDayInfo {
  const todayStr = getLocalTodayDate();
  const duration = stay.durationDays || 3;
  const currentSlot = getCurrentTimeSlot(now);
  const currentSlotInfo = getTimeSlotLabel(currentSlot);

  const dayOfMonth = now.getDate();
  const monthShort = now.toLocaleDateString('ms-MY', { month: 'short' });
  const dayName = now.toLocaleDateString('ms-MY', { weekday: 'long' });
  const todayFormatted = `${dayName}, ${dayOfMonth} ${monthShort}`;

  if (!stay.startDate) {
    const fallbackDay = 1;
    const dateInfo = getDateForDay(undefined, fallbackDay);
    const dayContext = getDayContextLabel(stay, fallbackDay);
    return {
      todayStr,
      dayNumber: fallbackDay,
      isTodayInStay: false,
      isBeforeStay: false,
      isAfterStay: false,
      currentSlot,
      currentSlotInfo,
      todayFormatted,
      dayContext,
      dateInfo
    };
  }

  const start = parseDateString(stay.startDate);
  const today = parseDateString(todayStr);

  if (!start || !today) {
    const fallbackDay = 1;
    const dateInfo = getDateForDay(stay.startDate, fallbackDay);
    const dayContext = getDayContextLabel(stay, fallbackDay);
    return {
      todayStr,
      dayNumber: fallbackDay,
      isTodayInStay: false,
      isBeforeStay: false,
      isAfterStay: false,
      currentSlot,
      currentSlotInfo,
      todayFormatted,
      dayContext,
      dateInfo
    };
  }

  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const rawDayNumber = diffDays + 1;

  const isTodayInStay = rawDayNumber >= 1 && rawDayNumber <= duration;
  const isBeforeStay = rawDayNumber < 1;
  const isAfterStay = rawDayNumber > duration;

  const clampedDayNumber = Math.min(Math.max(1, rawDayNumber), duration);
  const dateInfo = getDateForDay(stay.startDate, clampedDayNumber);
  const dayContext = getDayContextLabel(stay, clampedDayNumber);

  return {
    todayStr,
    dayNumber: clampedDayNumber,
    isTodayInStay,
    isBeforeStay,
    isAfterStay,
    currentSlot,
    currentSlotInfo,
    todayFormatted,
    dayContext,
    dateInfo
  };
}

