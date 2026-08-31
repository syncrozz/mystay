import { Stay, AgendaItem, ChecklistItem, StayType, TimeSlot, ActivityPriority, ChecklistCategory } from '../types';

/**
 * SYNCROZZ ENGINEERING STANDARD (SES) v4.4 LOCKED
 * DATA SAFETY & PORTABILITY UTILITIES
 * 
 * Objectives:
 * - Deterministic CSV Export & Import with RFC 4180 compliance and UTF-8 BOM.
 * - Clean Offline Data Backup & Recovery.
 * - Non-destructive Duplicate & Conflict Detection / Audit.
 * - Validation & Safe Commit Engine.
 */

export interface MyStayBackupPayload {
  version: '4.4';
  appName: 'MyStay';
  exportedAt: string;
  timestamp: number;
  data: {
    stays: Stay[];
    agendaItems: AgendaItem[];
    checklistItems: ChecklistItem[];
    activeStayId: string | null;
  };
}

export interface DuplicateItemInfo {
  id: string;
  stayId: string;
  stayTitle: string;
  title: string;
  detail: string;
  createdAt?: number;
}

export interface DuplicateGroup {
  groupId: string;
  type: 'agenda' | 'checklist' | 'stay';
  title: string;
  stayTitle: string;
  reason: string;
  items: DuplicateItemInfo[];
  primaryId: string; // The earliest created item
  duplicateIds: string[]; // Duplicate candidates
}

export interface DuplicateAuditReport {
  scannedCount: {
    stays: number;
    agenda: number;
    checklist: number;
    total: number;
  };
  totalDuplicatesCount: number;
  groups: DuplicateGroup[];
  hasDuplicates: boolean;
}

export interface ValidatedCsvRow {
  rowNumber: number;
  recordType: 'ACTIVITY' | 'CHECKLIST' | 'STAY';
  stayTitle: string;
  itemTitle: string;
  dayNumber?: number;
  timeSlot?: TimeSlot;
  timeSpecific?: string;
  priority?: ActivityPriority;
  category?: ChecklistCategory;
  locationName?: string;
  personInCharge?: string;
  descriptionNotes?: string;
  isCompleted: boolean;
  startDate?: string;
  endDate?: string;
  stayType?: StayType;
  address?: string;
  companions?: string[];
  houseRules?: string[];
  status: 'valid' | 'duplicate' | 'invalid';
  statusReason?: string;
  existingMatchId?: string;
}

export interface CsvValidationResult {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ValidatedCsvRow[];
  detectedStayTitles: string[];
  errors: string[];
}

/**
 * Escapes a field for RFC 4180 CSV compliance.
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Normalizes text for comparison (removes redundant spacing, case-insensitive).
 */
export function normalizeText(text: string): string {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ----------------------------------------------------------------------------------
// 1. "SIMPAN CSV" (RFC 4180 DETERMINISTIC EXPORT WITH UTF-8 BOM)
// ----------------------------------------------------------------------------------

export const CSV_HEADERS = [
  'Record_Type',
  'Stay_Title',
  'Day_Number',
  'Time_Slot',
  'Time_Specific',
  'Item_Title',
  'Priority',
  'Category',
  'Location_Name',
  'Person_In_Charge',
  'Description_Notes',
  'Completed',
  'Start_Date',
  'End_Date',
  'Stay_Type',
  'Address',
  'Companions',
  'House_Rules'
];

/**
 * Exports application stays, activities, and checklist items into a standard portable CSV.
 */
export function generateApplicationCsv(
  stays: Stay[],
  agendaItems: AgendaItem[],
  checklistItems: ChecklistItem[],
  targetStayId?: string
): string {
  const selectedStays = targetStayId ? stays.filter((s) => s.id === targetStayId) : stays;
  const stayIdSet = new Set(selectedStays.map((s) => s.id));
  const stayTitleMap = new Map(selectedStays.map((s) => [s.id, s.title]));

  const relevantAgendas = agendaItems.filter((a) => stayIdSet.has(a.stayId));
  const relevantChecklists = checklistItems.filter((c) => stayIdSet.has(c.stayId));

  const rows: string[][] = [];

  // 1. Stays Header Rows
  selectedStays.forEach((stay) => {
    rows.push([
      'STAY',
      stay.title,
      '', // Day_Number
      '', // Time_Slot
      '', // Time_Specific
      stay.title, // Item_Title
      '', // Priority
      '', // Category
      stay.location || '',
      stay.hostName || '',
      stay.importantNotes || '',
      'TIDAK', // Completed
      stay.startDate || '',
      stay.endDate || '',
      stay.type || 'homestay',
      stay.address || '',
      (stay.companions || []).join('; '),
      (stay.houseRules || []).join('; ')
    ]);
  });

  // 2. Agenda Items Rows
  relevantAgendas.forEach((item) => {
    const stayTitle = stayTitleMap.get(item.stayId) || 'Rancangan';
    rows.push([
      'ACTIVITY',
      stayTitle,
      String(item.dayNumber || 0),
      item.timeSlot || 'flexible',
      item.timeSpecific || '',
      item.title || '',
      item.priority || 'must_do',
      '', // Category
      item.locationName || '',
      item.personInCharge || '',
      (item.description || item.notes) ? `${item.description || ''}${item.notes ? ` [Nota: ${item.notes}]` : ''}` : '',
      item.isCompleted ? 'YA' : 'TIDAK',
      '', // Start_Date
      '', // End_Date
      '', // Stay_Type
      '', // Address
      '', // Companions
      ''  // House_Rules
    ]);
  });

  // 3. Checklist Items Rows
  relevantChecklists.forEach((item) => {
    const stayTitle = stayTitleMap.get(item.stayId) || 'Rancangan';
    rows.push([
      'CHECKLIST',
      stayTitle,
      '', // Day_Number
      '', // Time_Slot
      '', // Time_Specific
      item.text || '',
      '', // Priority
      item.category || 'essentials',
      '', // Location_Name
      '', // Person_In_Charge
      '', // Description_Notes
      item.isCompleted ? 'YA' : 'TIDAK',
      '', // Start_Date
      '', // End_Date
      '', // Stay_Type
      '', // Address
      '', // Companions
      ''  // House_Rules
    ]);
  });

  // Assemble CSV with UTF-8 BOM
  const csvContent = [
    CSV_HEADERS.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  return '\uFEFF' + csvContent;
}

// ----------------------------------------------------------------------------------
// 2. "BACKUP DATA" (OFFLINE RECOVERY DATA PAYLOAD)
// ----------------------------------------------------------------------------------

/**
 * Creates an offline backup data payload containing only actual user-created records.
 */
export function createDataBackupPayload(
  stays: Stay[],
  agendaItems: AgendaItem[],
  checklistItems: ChecklistItem[],
  activeStayId: string | null
): MyStayBackupPayload {
  return {
    version: '4.4',
    appName: 'MyStay',
    exportedAt: new Date().toISOString(),
    timestamp: Date.now(),
    data: {
      stays: stays || [],
      agendaItems: agendaItems || [],
      checklistItems: checklistItems || [],
      activeStayId: activeStayId || (stays.length > 0 ? stays[0].id : null)
    }
  };
}

/**
 * Validates a backup data payload before restoring.
 */
export function validateBackupPayload(rawText: string): {
  isValid: boolean;
  error?: string;
  payload?: MyStayBackupPayload;
  summary?: { staysCount: number; agendaCount: number; checklistCount: number; date: string };
} {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Format data sandaran tidak sah.' };
    }

    // Check structure
    const data = parsed.data || parsed;
    const stays = Array.isArray(data.stays) ? data.stays : [];
    const agendaItems = Array.isArray(data.agendaItems) ? data.agendaItems : [];
    const checklistItems = Array.isArray(data.checklistItems) ? data.checklistItems : [];

    if (stays.length === 0 && agendaItems.length === 0 && checklistItems.length === 0) {
      return { isValid: false, error: 'Fail sandaran kosong atau tiada rekod data dijumpai.' };
    }

    const payload: MyStayBackupPayload = {
      version: '4.4',
      appName: 'MyStay',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      timestamp: parsed.timestamp || Date.now(),
      data: {
        stays,
        agendaItems,
        checklistItems,
        activeStayId: data.activeStayId || (stays.length > 0 ? stays[0].id : null)
      }
    };

    return {
      isValid: true,
      payload,
      summary: {
        staysCount: stays.length,
        agendaCount: agendaItems.length,
        checklistCount: checklistItems.length,
        date: parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString('ms-MY') : 'Terkini'
      }
    };
  } catch (err: any) {
    return { isValid: false, error: 'Gagal memproses fail sandaran: ' + (err?.message || 'Format tidak sah') };
  }
}

// ----------------------------------------------------------------------------------
// 3. "AUDIT DUPLIKASI" (DETECTION & REVIEW ONLY - NO AUTO DELETE)
// ----------------------------------------------------------------------------------

/**
 * Scans current stays, agenda, and checklists for duplicates or near-duplicates.
 */
export function auditDuplicateRecords(
  stays: Stay[],
  agendaItems: AgendaItem[],
  checklistItems: ChecklistItem[]
): DuplicateAuditReport {
  const groups: DuplicateGroup[] = [];
  const stayMap = new Map(stays.map((s) => [s.id, s]));

  // 1. Audit Agenda Items for duplicates (same stay + normalized title + matching dayNumber)
  const agendaKeyMap = new Map<string, AgendaItem[]>();
  agendaItems.forEach((item) => {
    const normTitle = normalizeText(item.title);
    if (!normTitle) return;
    // Composite key: stayId + dayNumber + normalized title
    const key = `${item.stayId}__day${item.dayNumber}__${normTitle}`;
    const existing = agendaKeyMap.get(key) || [];
    existing.push(item);
    agendaKeyMap.set(key, existing);
  });

  agendaKeyMap.forEach((items, key) => {
    if (items.length > 1) {
      // Sort by creation time (earliest is primary)
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const primary = items[0];
      const duplicates = items.slice(1);
      const stay = stayMap.get(primary.stayId);
      const stayTitle = stay?.title || 'Rancangan';
      const dayLabel = primary.dayNumber === 0 ? 'Pool Perancangan (Belum Set)' : `Hari ${primary.dayNumber}`;

      groups.push({
        groupId: `dup_agenda_${key}`,
        type: 'agenda',
        title: primary.title,
        stayTitle,
        reason: `Aktiviti bertajuk sama "${primary.title}" dikesan berulang kali pada ${dayLabel}.`,
        primaryId: primary.id,
        duplicateIds: duplicates.map((d) => d.id),
        items: items.map((i) => ({
          id: i.id,
          stayId: i.stayId,
          stayTitle,
          title: i.title,
          detail: `${i.timeSlot.toUpperCase()} • ${i.locationName || 'Tiada Lokasi'} • ${i.isCompleted ? 'Selesai' : 'Belum Selesai'}`,
          createdAt: i.createdAt
        }))
      });
    }
  });

  // 2. Audit Checklist Items for duplicates (same stay + normalized text)
  const checklistKeyMap = new Map<string, ChecklistItem[]>();
  checklistItems.forEach((item) => {
    const normText = normalizeText(item.text);
    if (!normText) return;
    const key = `${item.stayId}__${item.category}__${normText}`;
    const existing = checklistKeyMap.get(key) || [];
    existing.push(item);
    checklistKeyMap.set(key, existing);
  });

  checklistKeyMap.forEach((items, key) => {
    if (items.length > 1) {
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const primary = items[0];
      const duplicates = items.slice(1);
      const stay = stayMap.get(primary.stayId);
      const stayTitle = stay?.title || 'Rancangan';

      groups.push({
        groupId: `dup_checklist_${key}`,
        type: 'checklist',
        title: primary.text,
        stayTitle,
        reason: `Item senarai semak "${primary.text}" dijumpai lebih daripada sekali dalam kategori ${primary.category}.`,
        primaryId: primary.id,
        duplicateIds: duplicates.map((d) => d.id),
        items: items.map((i) => ({
          id: i.id,
          stayId: i.stayId,
          stayTitle,
          title: i.text,
          detail: `Kategori: ${i.category} • ${i.isCompleted ? 'Telah Dibungkus' : 'Belum Dibungkus'}`,
          createdAt: i.createdAt
        }))
      });
    }
  });

  // 3. Audit Stays for duplicates (same normalized title and overlapping dates)
  const stayTitleMap = new Map<string, Stay[]>();
  stays.forEach((s) => {
    const normTitle = normalizeText(s.title);
    if (!normTitle) return;
    const existing = stayTitleMap.get(normTitle) || [];
    existing.push(s);
    stayTitleMap.set(normTitle, existing);
  });

  stayTitleMap.forEach((items, normTitle) => {
    if (items.length > 1) {
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const primary = items[0];
      const duplicates = items.slice(1);

      groups.push({
        groupId: `dup_stay_${normTitle}`,
        type: 'stay',
        title: primary.title,
        stayTitle: primary.title,
        reason: `Rancangan bertajuk "${primary.title}" dikesan berulang kali dengan tarikh yang bertindih.`,
        primaryId: primary.id,
        duplicateIds: duplicates.map((d) => d.id),
        items: items.map((s) => ({
          id: s.id,
          stayId: s.id,
          stayTitle: s.title,
          title: s.title,
          detail: `${s.startDate} hingga ${s.endDate} • Lokasi: ${s.location}`,
          createdAt: s.createdAt
        }))
      });
    }
  });

  const totalDuplicatesCount = groups.reduce((acc, g) => acc + g.duplicateIds.length, 0);

  return {
    scannedCount: {
      stays: stays.length,
      agenda: agendaItems.length,
      checklist: checklistItems.length,
      total: stays.length + agendaItems.length + checklistItems.length
    },
    totalDuplicatesCount,
    groups,
    hasDuplicates: groups.length > 0
  };
}

// ----------------------------------------------------------------------------------
// 4. "IMPORT CSV" (PARSING, VALIDATION, CONFLICT DETECTION)
// ----------------------------------------------------------------------------------

/**
 * Robust RFC 4180 CSV parser handling newlines, quotes, and commas.
 */
export function parseRawCsvText(csvText: string): string[][] {
  const cleanText = (csvText || '').replace(/^\uFEFF/, ''); // Remove UTF-8 BOM
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          insideQuote = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++; // Skip \n
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  // Push last field and row if any
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out empty lines
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/**
 * Validates parsed CSV rows against current database state.
 */
export function validateCsvRows(
  parsedRows: string[][],
  existingStays: Stay[],
  existingAgenda: AgendaItem[],
  existingChecklist: ChecklistItem[],
  defaultStayId?: string
): CsvValidationResult {
  if (parsedRows.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      rows: [],
      detectedStayTitles: [],
      errors: ['Fail CSV kosong.']
    };
  }

  const headerRow = parsedRows[0].map((h) => h.trim().toLowerCase());
  const hasStandardHeader =
    headerRow.includes('record_type') ||
    headerRow.includes('stay_title') ||
    headerRow.includes('item_title') ||
    headerRow.includes('title') ||
    headerRow.includes('aktiviti');

  const dataRows = hasStandardHeader ? parsedRows.slice(1) : parsedRows;

  // Header mapping indices
  const getColIdx = (names: string[]): number => {
    return headerRow.findIndex((h) => names.some((n) => h.includes(n.toLowerCase())));
  };

  const idxType = getColIdx(['record_type', 'type', 'jenis']);
  const idxStayTitle = getColIdx(['stay_title', 'stay', 'rancangan', 'penginapan']);
  const idxDayNumber = getColIdx(['day_number', 'day', 'hari']);
  const idxTimeSlot = getColIdx(['time_slot', 'slot', 'waktu']);
  const idxTimeSpecific = getColIdx(['time_specific', 'masa', 'time']);
  const idxItemTitle = getColIdx(['item_title', 'title', 'tajuk', 'aktiviti', 'perkara', 'item']);
  const idxPriority = getColIdx(['priority', 'keutamaan']);
  const idxCategory = getColIdx(['category', 'kategori']);
  const idxLocation = getColIdx(['location_name', 'location', 'lokasi', 'tempat']);
  const idxPerson = getColIdx(['person_in_charge', 'pic', 'orang', 'person']);
  const idxNotes = getColIdx(['description_notes', 'description', 'notes', 'nota', 'keterangan']);
  const idxCompleted = getColIdx(['completed', 'selesai', 'status']);
  const idxStartDate = getColIdx(['start_date', 'mula', 'tarikh_mula']);
  const idxEndDate = getColIdx(['end_date', 'tamat', 'tarikh_tamat']);
  const idxStayType = getColIdx(['stay_type', 'kategori_stay']);
  const idxAddress = getColIdx(['address', 'alamat']);
  const idxCompanions = getColIdx(['companions', 'peserta', 'ahli']);
  const idxHouseRules = getColIdx(['house_rules', 'peraturan', 'syarat']);

  // Build lookups for fast duplicate detection against existing DB records
  const existingStayMap = new Map(existingStays.map((s) => [normalizeText(s.title), s]));
  const defaultStay = defaultStayId ? existingStays.find((s) => s.id === defaultStayId) : existingStays[0];

  const existingAgendaSet = new Set(
    existingAgenda.map((a) => {
      const stay = existingStays.find((s) => s.id === a.stayId);
      const stayNorm = normalizeText(stay?.title || '');
      return `${stayNorm}__${a.dayNumber}__${normalizeText(a.title)}`;
    })
  );

  const existingChecklistSet = new Set(
    existingChecklist.map((c) => {
      const stay = existingStays.find((s) => s.id === c.stayId);
      const stayNorm = normalizeText(stay?.title || '');
      return `${stayNorm}__${c.category}__${normalizeText(c.text)}`;
    })
  );

  // In-file duplicate tracker
  const inCsvAgendaSeen = new Set<string>();
  const inCsvChecklistSeen = new Set<string>();
  const inCsvStaySeen = new Set<string>();

  const validatedRows: ValidatedCsvRow[] = [];
  const detectedStayTitles = new Set<string>();

  dataRows.forEach((row, index) => {
    const rowNumber = hasStandardHeader ? index + 2 : index + 1;

    // Extract values with fallbacks
    const rawType = (idxType >= 0 ? row[idxType] : '').trim().toUpperCase();
    const rawStayTitle = (idxStayTitle >= 0 ? row[idxStayTitle] : '').trim() || defaultStay?.title || 'Rancangan Percutian';
    const rawItemTitle = (idxItemTitle >= 0 ? row[idxItemTitle] : (row[0] || '')).trim();
    const rawDayNumber = idxDayNumber >= 0 ? parseInt(row[idxDayNumber], 10) : 0;
    const rawTimeSlot = (idxTimeSlot >= 0 ? row[idxTimeSlot] : '').trim().toLowerCase();
    const rawTimeSpecific = (idxTimeSpecific >= 0 ? row[idxTimeSpecific] : '').trim();
    const rawPriority = (idxPriority >= 0 ? row[idxPriority] : '').trim().toLowerCase();
    const rawCategory = (idxCategory >= 0 ? row[idxCategory] : '').trim().toLowerCase();
    const rawLocation = (idxLocation >= 0 ? row[idxLocation] : '').trim();
    const rawPerson = (idxPerson >= 0 ? row[idxPerson] : '').trim();
    const rawNotes = (idxNotes >= 0 ? row[idxNotes] : '').trim();
    const rawCompleted = (idxCompleted >= 0 ? row[idxCompleted] : '').trim().toUpperCase();
    const rawStartDate = (idxStartDate >= 0 ? row[idxStartDate] : '').trim();
    const rawEndDate = (idxEndDate >= 0 ? row[idxEndDate] : '').trim();
    const rawStayType = (idxStayType >= 0 ? row[idxStayType] : '').trim().toLowerCase();
    const rawAddress = (idxAddress >= 0 ? row[idxAddress] : '').trim();
    const rawCompanions = (idxCompanions >= 0 ? row[idxCompanions] : '').trim();
    const rawHouseRules = (idxHouseRules >= 0 ? row[idxHouseRules] : '').trim();

    if (!rawItemTitle && !rawStayTitle) {
      validatedRows.push({
        rowNumber,
        recordType: 'ACTIVITY',
        stayTitle: rawStayTitle,
        itemTitle: '',
        isCompleted: false,
        status: 'invalid',
        statusReason: 'Baris kosong atau tiada tajuk item / rancangan.'
      });
      return;
    }

    detectedStayTitles.add(rawStayTitle);

    // Determine Record Type
    let recordType: 'ACTIVITY' | 'CHECKLIST' | 'STAY' = 'ACTIVITY';
    if (rawType === 'STAY' || rawType === 'PENGINAPAN' || rawType === 'RANCANGAN') {
      recordType = 'STAY';
    } else if (rawType === 'CHECKLIST' || rawType === 'SENARAI_SEMAK' || rawCategory) {
      recordType = 'CHECKLIST';
    } else {
      recordType = 'ACTIVITY';
    }

    // Normalize specific types
    const validTimeSlots: TimeSlot[] = ['morning', 'midday', 'afternoon', 'evening', 'flexible'];
    const timeSlot: TimeSlot = validTimeSlots.includes(rawTimeSlot as TimeSlot) ? (rawTimeSlot as TimeSlot) : 'flexible';

    const validPriorities: ActivityPriority[] = ['must_do', 'optional', 'food', 'rest', 'logistics'];
    const priority: ActivityPriority = validPriorities.includes(rawPriority as ActivityPriority)
      ? (rawPriority as ActivityPriority)
      : 'must_do';

    const validCategories: ChecklistCategory[] = ['essentials', 'house_homestay', 'food_gifts', 'kids_elderly', 'custom'];
    const category: ChecklistCategory = validCategories.includes(rawCategory as ChecklistCategory)
      ? (rawCategory as ChecklistCategory)
      : 'essentials';

    const isCompleted = rawCompleted === 'YA' || rawCompleted === 'YES' || rawCompleted === 'TRUE' || rawCompleted === '1';

    const dayNumber = isNaN(rawDayNumber) || rawDayNumber < 0 ? 0 : rawDayNumber;

    const normStayTitle = normalizeText(rawStayTitle);
    const normItemTitle = normalizeText(rawItemTitle);

    // Check duplicate or validity based on record type
    if (recordType === 'STAY') {
      const stayKey = normItemTitle || normStayTitle;
      const isDbDup = existingStayMap.has(stayKey);
      const isInCsvDup = inCsvStaySeen.has(stayKey);

      if (isDbDup || isInCsvDup) {
        validatedRows.push({
          rowNumber,
          recordType: 'STAY',
          stayTitle: rawStayTitle,
          itemTitle: rawItemTitle || rawStayTitle,
          isCompleted: false,
          locationName: rawLocation,
          startDate: rawStartDate,
          endDate: rawEndDate,
          address: rawAddress,
          stayType: (rawStayType as StayType) || 'homestay',
          companions: rawCompanions ? rawCompanions.split(/;|,/).map((s) => s.trim()).filter(Boolean) : [],
          houseRules: rawHouseRules ? rawHouseRules.split(/;|,/).map((s) => s.trim()).filter(Boolean) : [],
          descriptionNotes: rawNotes,
          status: 'duplicate',
          statusReason: isDbDup ? 'Rancangan ini sudah wujud dalam pangkalan data.' : 'Rancangan berulang dalam fail CSV ini.'
        });
      } else {
        inCsvStaySeen.add(stayKey);
        validatedRows.push({
          rowNumber,
          recordType: 'STAY',
          stayTitle: rawStayTitle,
          itemTitle: rawItemTitle || rawStayTitle,
          isCompleted: false,
          locationName: rawLocation,
          startDate: rawStartDate,
          endDate: rawEndDate,
          address: rawAddress,
          stayType: (rawStayType as StayType) || 'homestay',
          companions: rawCompanions ? rawCompanions.split(/;|,/).map((s) => s.trim()).filter(Boolean) : [],
          houseRules: rawHouseRules ? rawHouseRules.split(/;|,/).map((s) => s.trim()).filter(Boolean) : [],
          descriptionNotes: rawNotes,
          status: 'valid'
        });
      }
    } else if (recordType === 'CHECKLIST') {
      if (!rawItemTitle) {
        validatedRows.push({
          rowNumber,
          recordType: 'CHECKLIST',
          stayTitle: rawStayTitle,
          itemTitle: '',
          category,
          isCompleted,
          status: 'invalid',
          statusReason: 'Teks item senarai semak diperlukan.'
        });
        return;
      }

      const chkKey = `${normStayTitle}__${category}__${normItemTitle}`;
      const isDbDup = existingChecklistSet.has(chkKey);
      const isInCsvDup = inCsvChecklistSeen.has(chkKey);

      if (isDbDup || isInCsvDup) {
        validatedRows.push({
          rowNumber,
          recordType: 'CHECKLIST',
          stayTitle: rawStayTitle,
          itemTitle: rawItemTitle,
          category,
          isCompleted,
          status: 'duplicate',
          statusReason: isDbDup ? 'Item ini sudah ada dalam senarai semak sedia ada.' : 'Item berulang dalam fail CSV ini.'
        });
      } else {
        inCsvChecklistSeen.add(chkKey);
        validatedRows.push({
          rowNumber,
          recordType: 'CHECKLIST',
          stayTitle: rawStayTitle,
          itemTitle: rawItemTitle,
          category,
          isCompleted,
          status: 'valid'
        });
      }
    } else {
      // ACTIVITY
      if (!rawItemTitle) {
        validatedRows.push({
          rowNumber,
          recordType: 'ACTIVITY',
          stayTitle: rawStayTitle,
          itemTitle: '',
          isCompleted,
          status: 'invalid',
          statusReason: 'Tajuk aktiviti diperlukan.'
        });
        return;
      }

      const agnKey = `${normStayTitle}__${dayNumber}__${normItemTitle}`;
      const isDbDup = existingAgendaSet.has(agnKey);
      const isInCsvDup = inCsvAgendaSeen.has(agnKey);

      if (isDbDup || isInCsvDup) {
        validatedRows.push({
          rowNumber,
          recordType: 'ACTIVITY',
          stayTitle: rawStayTitle,
          itemTitle: rawItemTitle,
          dayNumber,
          timeSlot,
          timeSpecific: rawTimeSpecific,
          priority,
          locationName: rawLocation,
          personInCharge: rawPerson,
          descriptionNotes: rawNotes,
          isCompleted,
          status: 'duplicate',
          statusReason: isDbDup ? `Aktiviti ini sudah wujud pada Hari ${dayNumber}.` : 'Aktiviti berulang dalam fail CSV ini.'
        });
      } else {
        inCsvAgendaSeen.add(agnKey);
        validatedRows.push({
          rowNumber,
          recordType: 'ACTIVITY',
          stayTitle: rawStayTitle,
          itemTitle: rawItemTitle,
          dayNumber,
          timeSlot,
          timeSpecific: rawTimeSpecific,
          priority,
          locationName: rawLocation,
          personInCharge: rawPerson,
          descriptionNotes: rawNotes,
          isCompleted,
          status: 'valid'
        });
      }
    }
  });

  const validCount = validatedRows.filter((r) => r.status === 'valid').length;
  const duplicateCount = validatedRows.filter((r) => r.status === 'duplicate').length;
  const invalidCount = validatedRows.filter((r) => r.status === 'invalid').length;

  return {
    totalRows: validatedRows.length,
    validCount,
    duplicateCount,
    invalidCount,
    rows: validatedRows,
    detectedStayTitles: Array.from(detectedStayTitles),
    errors: []
  };
}
