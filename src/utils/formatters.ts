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
 * Generates contextual day badge label:
 * e.g.
 * Day 1 (Travel): "🚗 Perjalanan"
 * Day 2 (Stay Day 1): "🏠 Stay Day 1"
 * Day 3 (Stay Day 2): "🏠 Stay Day 2"
 * Day 5 (Return Travel): "🚗 Perjalanan Balik" (or "🚗 Perjalanan" if day 1)
 */
export function getDayContextLabel(stay: Partial<Stay>, dayNumber: number): {
  type: DayType;
  label: string;
  shortLabel: string;
  icon: string;
  stayDayIndex?: number;
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

  // Calculate sequential stay day index (e.g. Stay Day 1, Stay Day 2)
  let stayIndex = 0;
  for (let d = 1; d <= dayNumber; d++) {
    if (getDayType(stay, d) === 'stay_day') {
      stayIndex++;
    }
  }

  return {
    type: 'stay_day',
    label: `Stay Day ${stayIndex}`,
    shortLabel: `Stay Day ${stayIndex}`,
    icon: '🏠',
    stayDayIndex: stayIndex
  };
}

export function formatDateRange(startDateStr?: string, endDateStr?: string, durationDays: number = 3): string {
  if (!startDateStr) return `${durationDays} Hari`;
  try {
    const start = new Date(startDateStr);
    const startFormatted = start.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
    if (!endDateStr) return `${startFormatted} (${durationDays} Hari)`;
    const end = new Date(endDateStr);
    const endFormatted = end.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startFormatted} – ${endFormatted} (${durationDays} Hari ${durationDays > 1 ? `${durationDays - 1} Malam` : ''})`;
  } catch {
    return `${durationDays} Hari`;
  }
}

export function generateWhatsAppMessage(stay: Stay, agendaItems: AgendaItem[], checklistItems?: ChecklistItem[]): string {
  const stayAgendas = agendaItems.filter((a) => a.stayId === stay.id);
  const summaryStr = formatStaySummary(stay);
  
  let msg = `🌟 *STAYPLAN: ${stay.title.toUpperCase()}*\n`;
  msg += `_"Plan the stay, not just the calendar."_\n\n`;
  
  msg += `📍 *Lokasi:* ${stay.location || 'Tidak dinyatakan'}\n`;
  if (stay.address) msg += `🗺️ *Alamat:* ${stay.address}\n`;
  msg += `📅 *Tempoh:* ${formatDateRange(stay.startDate, stay.endDate, stay.durationDays)} (${summaryStr})\n`;
  
  if (stay.companions && stay.companions.length > 0) {
    msg += `👥 *Bersama:* ${stay.companions.join(', ')}\n`;
  }
  
  if (stay.wifiSsid) {
    msg += `📶 *WiFi:* ${stay.wifiSsid} ${stay.wifiPassword ? `(Kata laluan: ${stay.wifiPassword})` : ''}\n`;
  }
  
  if (stay.hostContact) {
    msg += `📞 *Hubungi:* ${stay.hostName ? `${stay.hostName} ` : ''}(${stay.hostContact})\n`;
  }

  msg += `\n═══════════════════════\n`;
  msg += `   📋 *AGENDA & HARI PERJALANAN*   \n`;
  msg += `═══════════════════════\n`;

  for (let day = 1; day <= stay.durationDays; day++) {
    const dayItems = stayAgendas.filter((a) => a.dayNumber === day);
    const dayContext = getDayContextLabel(stay, day);
    msg += `\n📌 *HARI ${day}: ${dayContext.icon} ${dayContext.label}*\n`;

    if (dayItems.length === 0) {
      msg += `  _(Tiada aktiviti dirancang lagi)_\n`;
      continue;
    }

    const slotOrder: TimeSlot[] = ['morning', 'midday', 'afternoon', 'evening', 'flexible'];

    for (const slot of slotOrder) {
      const slotItems = dayItems.filter((i) => i.timeSlot === slot);
      if (slotItems.length === 0) continue;

      const slotMeta = TIME_SLOTS[slot];
      msg += `\n${slotMeta.icon} *${slotMeta.label}*\n`;

      slotItems.forEach((item) => {
        const priorityTag = item.priority === 'must_do' 
          ? '⭐ [WAJIB]' 
          : item.priority === 'food' 
          ? '🍽️ [MAKAN]' 
          : item.priority === 'rest' 
          ? '☕ [REHAT]' 
          : item.priority === 'logistics' 
          ? '🚗 [LOGISTIK]' 
          : '🌴 [PILIHAN]';

        const statusIcon = item.isCompleted ? '✅' : '•';
        const timeStr = item.timeSpecific ? ` (${item.timeSpecific})` : '';
        const locStr = item.locationName ? ` 📍 ${item.locationName}` : '';
        const picStr = item.personInCharge ? ` [PIC: ${item.personInCharge}]` : '';

        msg += `${statusIcon} ${priorityTag} *${item.title}*${timeStr}${locStr}${picStr}\n`;
        if (item.description) {
          msg += `   _${item.description}_\n`;
        }
      });
    }
    msg += `───────────────────────\n`;
  }

  if (stay.importantNotes || (stay.houseRules && stay.houseRules.length > 0)) {
    msg += `\n💡 *NOTA PENTING & PERATURAN:*\n`;
    if (stay.gatePin) msg += `🔑 *Kunci/Pin:* ${stay.gatePin}\n`;
    if (stay.importantNotes) msg += `• ${stay.importantNotes}\n`;
    if (stay.houseRules) {
      stay.houseRules.forEach((rule) => {
        msg += `• ${rule}\n`;
      });
    }
  }

  msg += `\n📱 _Disediakan dengan kasih sayang melalui StayPlan (stayplan.syncrozz.com)_`;

  return msg;
}

/**
 * Automatically converts text to Title Case.
 * Capitalizes the first letter of every word (including after spaces, hyphens, slashes, or parentheses).
 * Preserves trailing and intermediate whitespace during typing.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';

  return str.replace(/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}
