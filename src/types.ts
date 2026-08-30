export type UserRole = 'USER' | 'ADMIN' | 'MASTER_ADMIN';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export type StayType =
  | 'balik_kampung'
  | 'family_stay'
  | 'guest_hosting'
  | 'homestay'
  | 'weekend_getaway'
  | 'short_trip'
  | 'custom';

export type TimeSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'flexible';

export type SyncStatus = 'SAVED' | 'SAVING' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'OFFLINE';

export type ActivityPriority = 'must_do' | 'optional' | 'food' | 'rest' | 'logistics';

export interface AgendaItem {
  id: string;
  stayId: string;
  userId?: string;
  dayNumber: number; // 0 = Belum dijadualkan (Pool Perancangan), 1..N = Hari 1..N
  timeSlot: TimeSlot;
  timeSpecific?: string; // e.g. "08:30 AM" or "Lepas Subuh"
  title: string;
  description?: string;
  priority: ActivityPriority;
  locationName?: string;
  personInCharge?: string;
  isCompleted: boolean;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type ChecklistCategory = 'essentials' | 'house_homestay' | 'food_gifts' | 'kids_elderly' | 'custom';

export interface ChecklistItem {
  id: string;
  stayId: string;
  userId?: string;
  category: ChecklistCategory;
  text: string;
  isCompleted: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type DayType = 'travel_day' | 'stay_day';

export interface DayConfig {
  dayNumber: number;
  type: DayType;
  customLabel?: string;
}

export interface Stay {
  id: string;
  userId?: string;
  title: string;
  type: StayType;
  startDate: string;
  endDate: string;
  durationDays: number;
  location: string;
  address?: string;
  wazeUrl?: string;
  googleMapsUrl?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  hostContact?: string;
  hostName?: string;
  gatePin?: string;
  houseRules?: string[];
  importantNotes?: string;
  companions: string[];
  dayTypes?: Record<number, DayType>; // e.g. { 1: 'travel_day', 2: 'stay_day', 3: 'travel_day' }
  themeColor?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StayData {
  stays: Stay[];
  agendaItems: AgendaItem[];
  checklistItems: ChecklistItem[];
  activeStayId: string | null;
}
