import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Stay, AgendaItem, ChecklistItem, StayType, SyncStatus } from '../types';
import { SHOWCASE_STAYS, SHOWCASE_AGENDA_ITEMS, SHOWCASE_CHECKLIST_ITEMS } from '../data/defaultStays';
import { getLocalTodayDate, getLocalDateWithOffset } from '../utils/formatters';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { ValidatedCsvRow, MyStayBackupPayload, normalizeText } from '../utils/dataSafety';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';

interface StayContextType {
  stays: Stay[];
  activeStay: Stay | null;
  activeStayId: string | null;
  setActiveStayId: (id: string) => void;
  agendaItems: AgendaItem[];
  activeAgendaItems: AgendaItem[];
  checklistItems: ChecklistItem[];
  activeChecklistItems: ChecklistItem[];
  isPersonalMode: boolean;
  isLoadingStays: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  syncError: string | null;
  hasUnsavedChanges: boolean;
  unsavedCount: number;
  saveFeedback: { type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null;
  saveAndSync: (customSuccessMsg?: string) => Promise<{ success: boolean; message: string; staysCount: number }>;
  refreshFromCloud: (options?: { forceFetch?: boolean }) => Promise<{ success: boolean; message: string; staysCount: number }>;
  forceSyncWithCloud: () => Promise<{ success: boolean; message: string; staysCount: number }>;
  markChangesMade: () => void;
  clearSaveFeedback: () => void;
  addStay: (stay: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<string>;
  updateStay: (id: string, updates: Partial<Stay>) => Promise<void>;
  deleteStay: (id: string) => Promise<void>;
  duplicateStay: (id: string) => Promise<void>;
  addAgendaItem: (item: Omit<AgendaItem, 'id' | 'userId'>) => Promise<string>;
  updateAgendaItem: (id: string, updates: Partial<AgendaItem>) => Promise<void>;
  batchUpdateAgendaItems: (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<void>;
  toggleAgendaComplete: (id: string) => Promise<void>;
  addChecklistItem: (item: Omit<ChecklistItem, 'id' | 'userId'>) => Promise<string>;
  toggleChecklistComplete: (id: string) => Promise<void>;
  deleteChecklistItem: (id: string) => Promise<void>;
  createFromStarterTemplate: (templateType: StayType) => Promise<string>;
  exportDataJson: () => string;
  importCsvRows: (
    rows: ValidatedCsvRow[],
    defaultStayId?: string,
    onProgress?: (msg: string) => void
  ) => Promise<{ success: boolean; importedCount: number; message: string }>;
  restoreDataBackup: (payload: MyStayBackupPayload) => Promise<{ success: boolean; message: string }>;
  deleteDuplicateItems: (duplicateIds: {
    agendaIds: string[];
    checklistIds: string[];
    stayIds: string[];
  }) => Promise<{ success: boolean; message: string }>;
}

const StayContext = createContext<StayContextType | undefined>(undefined);

// Lightweight UI preference key (active stay selection only)
const getUserActivePrefKey = (uid: string) => `stayplan_personal_active_${uid}`;

/**
 * Sanitizes object by removing `undefined` values recursively so Firestore never errors on invalid values.
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = typeof val === 'object' && val !== null ? sanitizeForFirestore(val) : val;
      }
    }
    return cleaned as T;
  }
  return obj;
}

// ----------------------------------------------------------------------------------
// Deep comparison helpers to avoid redundant React state reference replacements
// ----------------------------------------------------------------------------------
function areStaysEqual(a: Stay[], b: Stay[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const s1 = a[i];
    const s2 = b[i];
    if (
      s1.id !== s2.id ||
      s1.updatedAt !== s2.updatedAt ||
      s1.title !== s2.title ||
      s1.type !== s2.type ||
      s1.startDate !== s2.startDate ||
      s1.endDate !== s2.endDate ||
      s1.location !== s2.location ||
      s1.durationDays !== s2.durationDays ||
      (s1.companions?.length || 0) !== (s2.companions?.length || 0) ||
      (s1.houseRules?.length || 0) !== (s2.houseRules?.length || 0)
    ) {
      return false;
    }
  }
  return true;
}

function areAgendaListsEqual(a: AgendaItem[], b: AgendaItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = b[i];
    if (
      a1.id !== a2.id ||
      a1.stayId !== a2.stayId ||
      a1.updatedAt !== a2.updatedAt ||
      a1.title !== a2.title ||
      a1.dayNumber !== a2.dayNumber ||
      a1.timeSlot !== a2.timeSlot ||
      a1.timeSpecific !== a2.timeSpecific ||
      a1.isCompleted !== a2.isCompleted ||
      a1.priority !== a2.priority ||
      a1.description !== a2.description ||
      a1.locationName !== a2.locationName ||
      a1.personInCharge !== a2.personInCharge ||
      a1.notes !== a2.notes
    ) {
      return false;
    }
  }
  return true;
}

function areChecklistListsEqual(a: ChecklistItem[], b: ChecklistItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const c1 = a[i];
    const c2 = b[i];
    if (
      c1.id !== c2.id ||
      c1.stayId !== c2.stayId ||
      c1.updatedAt !== c2.updatedAt ||
      c1.text !== c2.text ||
      c1.category !== c2.category ||
      c1.isCompleted !== c2.isCompleted
    ) {
      return false;
    }
  }
  return true;
}

// Storage cache keys for instant offline-first rendering
const CACHE_KEYS = {
  STAYS: 'stayplan_cached_stays_v5',
  AGENDA: 'stayplan_cached_agenda_v5',
  CHECKLIST: 'stayplan_cached_checklist_v5',
  ACTIVE_ID: 'stayplan_cached_active_id_v5'
};

const getInitialCachedStays = (): Stay[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.STAYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: any) => s && !s.id?.startsWith('showcase-') && !s.title?.startsWith('Contoh:'));
      }
    }
  } catch {}
  return [];
};

const getInitialCachedAgenda = (): AgendaItem[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.AGENDA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a: any) => a && !a.id?.startsWith('showcase-'));
      }
    }
  } catch {}
  return [];
};

const getInitialCachedChecklist = (): ChecklistItem[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.CHECKLIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c: any) => c && !c.id?.startsWith('showcase-'));
      }
    }
  } catch {}
  return [];
};

const getInitialCachedActiveStayId = (): string | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.ACTIVE_ID);
    if (raw && !raw.startsWith('showcase-')) return raw;
  } catch {}
  return null;
};

export const StayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isUnlocked, requireAuth } = useAuth();

  // Instant offline-first state initialization from cache
  const [userStays, setUserStays] = useState<Stay[]>(() => getInitialCachedStays());
  const [userAgendaItems, setUserAgendaItems] = useState<AgendaItem[]>(() => getInitialCachedAgenda());
  const [userChecklistItems, setUserChecklistItems] = useState<ChecklistItem[]>(() => getInitialCachedChecklist());
  const [activeStayId, setActiveStayIdState] = useState<string | null>(() => getInitialCachedActiveStayId());

  // Non-blocking loading indicator
  const [isLoadingStays, setIsLoadingStays] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (navigator.onLine ? 'SYNCED' : 'OFFLINE'));
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => Date.now());
  const [syncError, setSyncError] = useState<string | null>(null);

  // Health and realtime listener status references
  const staysListenerActiveRef = useRef<boolean>(false);
  const subcollectionsListenerActiveRef = useRef<boolean>(false);
  const hasPendingWritesRef = useRef<boolean>(false);
  const hasCheckedSeedRef = useRef<boolean>(false);

  // Unsaved changes & feedback
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [unsavedCount, setUnsavedCount] = useState<number>(0);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null>(null);

  const isPersonalMode = true; // In multi-device shared sync, live cloud data is always active

  // Persist cache to local storage on changes for instantaneous subsequent visits
  // Strictly overwrite cache even when arrays are empty so deletions/empty state are respected across reloads
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEYS.STAYS, JSON.stringify(userStays));
    } catch {}
  }, [userStays]);

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEYS.AGENDA, JSON.stringify(userAgendaItems));
    } catch {}
  }, [userAgendaItems]);

  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEYS.CHECKLIST, JSON.stringify(userChecklistItems));
    } catch {}
  }, [userChecklistItems]);

  useEffect(() => {
    try {
      if (activeStayId) {
        localStorage.setItem(CACHE_KEYS.ACTIVE_ID, activeStayId);
      } else {
        localStorage.removeItem(CACHE_KEYS.ACTIVE_ID);
      }
    } catch {}
  }, [activeStayId]);

  // Listen to network status (Online / Offline)
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('SYNCED');
      setSyncError(null);
    };
    const handleOffline = () => {
      setSyncStatus('OFFLINE');
      setSyncError('Tiada sambungan internet (Mod Luar Talian).');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const markChangesMade = useCallback(() => {
    // Retained for compatibility
  }, []);

  const clearSaveFeedback = useCallback(() => {
    setSaveFeedback(null);
  }, []);

  // ----------------------------------------------------------------------------------
  // 1. REFRESH FROM CLOUD (Authoritative Firestore Query Revalidation)
  // ----------------------------------------------------------------------------------
  const refreshFromCloud = useCallback(
    async (options?: { forceFetch?: boolean }): Promise<{ success: boolean; message: string; staysCount: number }> => {
      if (!navigator.onLine) {
        setSyncStatus('OFFLINE');
        return { success: false, message: 'Peranti anda sedang di luar talian (Offline).', staysCount: userStays.length };
      }

      // Fast-path: When realtime listener is active and no force-poll is requested
      const isListenerHealthy = staysListenerActiveRef.current && !options?.forceFetch;
      if (isListenerHealthy && !hasPendingWritesRef.current) {
        setSyncStatus('SYNCED');
        setSyncError(null);
        setLastSyncTime(Date.now());
        return {
          success: true,
          message: `Semua data telah diselaraskan (${userStays.length} stay).`,
          staysCount: userStays.length
        };
      }

      try {
        setIsSyncing(true);
        setSyncStatus('SYNCING');
        setSyncError(null);

        // Fetch central stays collection from Firestore
        const staysColRef = collection(db, 'stays');
        const staysSnap = await getDocs(staysColRef);

        const fetchedStays: Stay[] = [];
        staysSnap.forEach((docSnap) => {
          fetchedStays.push(docSnap.data() as Stay);
        });

        fetchedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (fetchedStays.length > 0) {
          setUserStays((prev) => (areStaysEqual(prev, fetchedStays) ? prev : fetchedStays));
        } else {
          setUserStays([]);
          setUserAgendaItems([]);
          setUserChecklistItems([]);
        }

        // Determine active stay
        let currentActive = activeStayId;
        if (!currentActive || !fetchedStays.some((s) => s.id === currentActive)) {
          currentActive = fetchedStays.length > 0 ? fetchedStays[0].id : null;
          setActiveStayIdState(currentActive);
        }

        // Parallel fetch for active stay's subcollections
        if (currentActive) {
          const agendaColRef = collection(db, 'stays', currentActive, 'agendaItems');
          const checklistColRef = collection(db, 'stays', currentActive, 'checklistItems');

          const [agendaSnap, checklistSnap] = await Promise.all([
            getDocs(agendaColRef),
            getDocs(checklistColRef)
          ]);

          const fetchedAgendas: AgendaItem[] = [];
          agendaSnap.forEach((d) => fetchedAgendas.push(d.data() as AgendaItem));

          const fetchedChecklists: ChecklistItem[] = [];
          checklistSnap.forEach((d) => fetchedChecklists.push(d.data() as ChecklistItem));

          if (fetchedAgendas.length > 0) {
            setUserAgendaItems((prev) => {
              const otherStays = prev.filter((i) => i.stayId !== currentActive);
              const merged = [...otherStays, ...fetchedAgendas];
              return areAgendaListsEqual(prev, merged) ? prev : merged;
            });
          }

          if (fetchedChecklists.length > 0) {
            setUserChecklistItems((prev) => {
              const otherStays = prev.filter((i) => i.stayId !== currentActive);
              const merged = [...otherStays, ...fetchedChecklists];
              return areChecklistListsEqual(prev, merged) ? prev : merged;
            });
          }
        }

        const now = Date.now();
        setLastSyncTime(now);
        setSyncStatus('SYNCED');
        setHasUnsavedChanges(false);
        setUnsavedCount(0);

        return {
          success: true,
          message: `Berjaya menyelaraskan ${fetchedStays.length || userStays.length} stay dari Cloud.`,
          staysCount: fetchedStays.length || userStays.length
        };
      } catch (err: any) {
        console.error('Refresh From Cloud Error:', err);
        const errMsg = err?.message || 'Gagal memuat semula data.';
        setSyncError(errMsg);
        setSyncStatus('ERROR');
        return { success: false, message: errMsg, staysCount: 0 };
      } finally {
        setIsSyncing(false);
      }
    },
    [activeStayId, userStays]
  );

  const forceSyncWithCloud = refreshFromCloud;

  const saveAndSync = useCallback(
    async (customSuccessMsg?: string): Promise<{ success: boolean; message: string; staysCount: number }> => {
      const res = await refreshFromCloud({ forceFetch: true });
      if (res.success) {
        setSaveFeedback({
          type: 'success',
          message: customSuccessMsg || 'Data telah diselaraskan merentas semua peranti.',
          timestamp: Date.now()
        });
      } else {
        setSaveFeedback({
          type: 'error',
          message: res.message || 'Sync gagal.',
          timestamp: Date.now()
        });
      }
      return res;
    },
    [refreshFromCloud]
  );

  // ----------------------------------------------------------------------------------
  // 2. DATA SUBSCRIPTION & HYDRATION (Universal Realtime Multi-Device Listener)
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    // Initial active stay id from local storage
    try {
      const savedActivePref = localStorage.getItem(CACHE_KEYS.ACTIVE_ID);
      if (savedActivePref) {
        setActiveStayIdState(savedActivePref);
      }
    } catch {}

    const staysColRef = collection(db, 'stays');

    // Realtime subscription to the central stays collection
    const unsubscribeStays = onSnapshot(
      staysColRef,
      (snapshot) => {
        staysListenerActiveRef.current = true;
        hasPendingWritesRef.current = snapshot.metadata.hasPendingWrites;

        const fetchedStays: Stay[] = [];
        snapshot.forEach((docSnap) => {
          const s = docSnap.data() as Stay;
          if (s && !s.id?.startsWith('showcase-') && !s.title?.startsWith('Contoh:')) {
            fetchedStays.push(s);
          }
        });

        fetchedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (fetchedStays.length > 0) {
          // Diffing check: only set state if stays array actually changed
          setUserStays((prev) => (areStaysEqual(prev, fetchedStays) ? prev : fetchedStays));

          setActiveStayIdState((prevActiveId) => {
            if (prevActiveId && fetchedStays.some((s) => s.id === prevActiveId)) {
              return prevActiveId;
            }
            const nextId = fetchedStays[0].id;
            try {
              localStorage.setItem(CACHE_KEYS.ACTIVE_ID, nextId);
            } catch {}
            return nextId;
          });
        } else {
          setUserStays([]);
          setActiveStayIdState(null);
        }

        setIsLoadingStays(false);
        setSyncStatus(navigator.onLine ? 'SYNCED' : 'OFFLINE');
        setLastSyncTime(Date.now());
        setSyncError(null);
      },
      (error) => {
        console.warn('Firestore stays subscription notice:', error);
        staysListenerActiveRef.current = false;
        if (error.code === 'unavailable' || !navigator.onLine) {
          setSyncStatus('OFFLINE');
          setSyncError('Beroperasi dalam mod luar talian (Offline).');
        } else {
          setSyncError(error.message || 'Ralat sambungan Firestore');
          setSyncStatus('ERROR');
        }
        setIsLoadingStays(false);
      }
    );

    return () => {
      staysListenerActiveRef.current = false;
      unsubscribeStays();
    };
  }, []);

  // ----------------------------------------------------------------------------------
  // 3. REALTIME SUBSCRIPTION FOR ACTIVE STAY'S SUBCOLLECTIONS (Agenda & Checklist)
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!activeStayId) {
      subcollectionsListenerActiveRef.current = false;
      return;
    }

    const agendaRef = collection(db, 'stays', activeStayId, 'agendaItems');
    const checklistRef = collection(db, 'stays', activeStayId, 'checklistItems');

    const unsubAgenda = onSnapshot(
      agendaRef,
      (snapshot) => {
        subcollectionsListenerActiveRef.current = true;
        hasPendingWritesRef.current = hasPendingWritesRef.current || snapshot.metadata.hasPendingWrites;

        const items: AgendaItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as AgendaItem));

        if (items.length > 0 || !snapshot.empty) {
          setUserAgendaItems((prev) => {
            const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
            const merged = [...otherStaysItems, ...items];
            return areAgendaListsEqual(prev, merged) ? prev : merged;
          });
        }
        setLastSyncTime(Date.now());
      },
      (err) => {
        console.warn('Agenda items sync status:', err);
      }
    );

    const unsubChecklist = onSnapshot(
      checklistRef,
      (snapshot) => {
        const items: ChecklistItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as ChecklistItem));

        if (items.length > 0 || !snapshot.empty) {
          setUserChecklistItems((prev) => {
            const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
            const merged = [...otherStaysItems, ...items];
            return areChecklistListsEqual(prev, merged) ? prev : merged;
          });
        }
        setLastSyncTime(Date.now());
      },
      (err) => {
        console.warn('Checklist items sync status:', err);
      }
    );

    return () => {
      subcollectionsListenerActiveRef.current = false;
      unsubAgenda();
      unsubChecklist();
    };
  }, [activeStayId]);

  // Active stay data selectors (Synchronized across all devices)
  const stays = useMemo(() => {
    return userStays.length > 0 ? userStays : SHOWCASE_STAYS;
  }, [userStays]);

  const activeStay = useMemo(() => {
    if (!stays || stays.length === 0) return null;
    const found = stays.find((s) => s.id === activeStayId);
    return found || stays[0] || null;
  }, [stays, activeStayId]);

  const activeAgendaItems = useMemo(() => {
    if (!activeStay) return [];
    const items = userAgendaItems.filter((i) => i.stayId === activeStay.id);
    if (items.length > 0) return items;
    return SHOWCASE_AGENDA_ITEMS.filter((i) => i.stayId === activeStay.id);
  }, [activeStay, userAgendaItems]);

  const activeChecklistItems = useMemo(() => {
    if (!activeStay) return [];
    const items = userChecklistItems.filter((i) => i.stayId === activeStay.id);
    if (items.length > 0) return items;
    return SHOWCASE_CHECKLIST_ITEMS.filter((i) => i.stayId === activeStay.id);
  }, [activeStay, userChecklistItems]);

  const setActiveStayId = (id: string) => {
    setActiveStayIdState(id);
    try {
      localStorage.setItem(CACHE_KEYS.ACTIVE_ID, id);
    } catch {}
  };

  // ----------------------------------------------------------------------------------
  // 4. AWAITED FIRESTORE WRITE MUTATIONS (Server-Authoritative Realtime Sync)
  // ----------------------------------------------------------------------------------

  const addStay = useCallback(
    async (newStayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> => {
      const stayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'admin_device';
      const newStay: Stay = {
        ...newStayData,
        id: stayId,
        userId: currentUid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic state update: Create stay with pure clean state (no auto-seeded agenda/checklist)
      setUserStays((prev) => [newStay, ...prev]);
      setActiveStayIdState(stayId);

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const stayDocRef = doc(db, 'stays', stayId);
        await setDoc(stayDocRef, sanitizeForFirestore<Stay>(newStay));

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore addStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menyimpan Stay ke Cloud Firestore.');
        throw err;
      } finally {
        setIsSyncing(false);
      }

      return stayId;
    },
    [user]
  );

  const updateStay = useCallback(
    async (id: string, updates: Partial<Stay>) => {
      const now = Date.now();
      const sanitizedUpdates = sanitizeForFirestore<Partial<Stay>>({
        ...updates,
        updatedAt: now
      });

      // Optimistic UI update
      setUserStays((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: now } : s)));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const stayRef = doc(db, 'stays', id);
        await updateDoc(stayRef, sanitizedUpdates);

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore updateStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini Stay di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const deleteStay = useCallback(
    async (id: string) => {
      // Optimistic UI removal
      setUserStays((prev) => {
        const next = prev.filter((s) => s.id !== id);
        const nextActive = next.length > 0 ? next[0].id : null;
        setActiveStayIdState(nextActive);
        return next;
      });
      setUserAgendaItems((prev) => prev.filter((a) => a.stayId !== id));
      setUserChecklistItems((prev) => prev.filter((c) => c.stayId !== id));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const agendaSnap = await getDocs(collection(db, 'stays', id, 'agendaItems'));
        const checklistSnap = await getDocs(collection(db, 'stays', id, 'checklistItems'));

        const batch = writeBatch(db);
        agendaSnap.forEach((d) => batch.delete(d.ref));
        checklistSnap.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(db, 'stays', id));

        await batch.commit();

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore deleteStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal memadam Stay di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const duplicateStay = useCallback(
    async (id: string) => {
      const target = userStays.find((s) => s.id === id) || SHOWCASE_STAYS.find((s) => s.id === id);
      if (!target) return;

      const newStayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'admin_device';
      const duplicatedStay: Stay = {
        ...target,
        id: newStayId,
        userId: currentUid,
        title: `${target.title} (Salinan)`,
        createdAt: now,
        updatedAt: now
      };

      const sourceAgendas = userAgendaItems.filter((a) => a.stayId === id);
      const dupAgendas: AgendaItem[] = (sourceAgendas.length > 0 ? sourceAgendas : SHOWCASE_AGENDA_ITEMS.filter((a) => a.stayId === id)).map((a, i) => ({
        ...a,
        id: `agn_${now}_${i}`,
        stayId: newStayId,
        userId: currentUid,
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      }));

      const sourceChecklists = userChecklistItems.filter((c) => c.stayId === id);
      const dupChecklists: ChecklistItem[] = (sourceChecklists.length > 0 ? sourceChecklists : SHOWCASE_CHECKLIST_ITEMS.filter((c) => c.stayId === id)).map((c, i) => ({
        ...c,
        id: `chk_${now}_${i}`,
        stayId: newStayId,
        userId: currentUid,
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      }));

      // Optimistic updates
      setUserStays((prev) => [duplicatedStay, ...prev]);
      setUserAgendaItems((prev) => [...prev, ...dupAgendas]);
      setUserChecklistItems((prev) => [...prev, ...dupChecklists]);
      setActiveStayIdState(newStayId);

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const batch = writeBatch(db);
        const stayRef = doc(db, 'stays', newStayId);
        batch.set(stayRef, sanitizeForFirestore<Stay>(duplicatedStay));

        dupAgendas.forEach((item) => {
          const itemRef = doc(collection(db, 'stays', newStayId, 'agendaItems'), item.id);
          batch.set(itemRef, sanitizeForFirestore<AgendaItem>(item));
        });

        dupChecklists.forEach((item) => {
          const itemRef = doc(collection(db, 'stays', newStayId, 'checklistItems'), item.id);
          batch.set(itemRef, sanitizeForFirestore<ChecklistItem>(item));
        });

        await batch.commit();

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore duplicateStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menduplikasi Stay di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, userStays, userAgendaItems, userChecklistItems]
  );

  const addAgendaItem = useCallback(
    async (item: Omit<AgendaItem, 'id' | 'userId'>): Promise<string> => {
      if (!activeStay) {
        return '';
      }

      const newItemId = `agn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'admin_device';
      const newItem: AgendaItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: currentUid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic update
      setUserAgendaItems((prev) => [...prev, newItem]);

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const colRef = collection(db, 'stays', activeStay.id, 'agendaItems');
        const docRef = doc(colRef, newItemId);
        await setDoc(docRef, sanitizeForFirestore<AgendaItem>(newItem));

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore addAgendaItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menambah aktiviti ke Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }

      return newItemId;
    },
    [user, activeStay]
  );

  const updateAgendaItem = useCallback(
    async (id: string, updates: Partial<AgendaItem>) => {
      if (!activeStay) return;

      const now = Date.now();
      const sanitizedUpdates = sanitizeForFirestore<Partial<AgendaItem>>({
        ...updates,
        updatedAt: now
      });

      // Optimistic update
      setUserAgendaItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a)));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'stays', activeStay.id, 'agendaItems', id);
        await updateDoc(itemRef, sanitizedUpdates);

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore updateAgendaItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeStay]
  );

  const batchUpdateAgendaItems = useCallback(
    async (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => {
      if (!activeStay || updatesList.length === 0) return;

      const now = Date.now();
      const updateMap = new Map(updatesList.map((u) => [u.id, u.updates]));

      // Optimistic update
      setUserAgendaItems((prev) =>
        prev.map((a) => {
          const up = updateMap.get(a.id);
          return up ? { ...a, ...up, updatedAt: now } : a;
        })
      );

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const batch = writeBatch(db);
        for (const item of updatesList) {
          const itemRef = doc(db, 'stays', activeStay.id, 'agendaItems', item.id);
          batch.update(itemRef, sanitizeForFirestore<Partial<AgendaItem>>({ ...item.updates, updatedAt: now }));
        }
        await batch.commit();

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore batchUpdateAgendaItems error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini susunan aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeStay]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!activeStay) return;

      // Optimistic removal
      setUserAgendaItems((prev) => prev.filter((a) => a.id !== id));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'stays', activeStay.id, 'agendaItems', id);
        await deleteDoc(itemRef);

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore deleteAgendaItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal memadam aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeStay]
  );

  const toggleAgendaComplete = useCallback(
    async (id: string) => {
      if (!activeStay) return;

      const existing = userAgendaItems.find((i) => i.id === id) || SHOWCASE_AGENDA_ITEMS.find((i) => i.id === id);
      if (!existing) return;
      const nextCompleted = !existing.isCompleted;
      const now = Date.now();

      // Optimistic update
      setUserAgendaItems((prev) => {
        const found = prev.some((a) => a.id === id);
        if (found) {
          return prev.map((a) => (a.id === id ? { ...a, isCompleted: nextCompleted, updatedAt: now } : a));
        } else {
          return [...prev, { ...existing, isCompleted: nextCompleted, updatedAt: now }];
        }
      });

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'stays', activeStay.id, 'agendaItems', id);
        await setDoc(itemRef, { ...existing, isCompleted: nextCompleted, updatedAt: now }, { merge: true });

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore toggleAgendaComplete error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menanda aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeStay, userAgendaItems]
  );

  const addChecklistItem = useCallback(
    async (item: Omit<ChecklistItem, 'id' | 'userId'>): Promise<string> => {
      if (!activeStay) {
        return '';
      }

      const newItemId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'admin_device';
      const newItem: ChecklistItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: currentUid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic update
      setUserChecklistItems((prev) => [...prev, newItem]);

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const colRef = collection(db, 'stays', activeStay.id, 'checklistItems');
        const docRef = doc(colRef, newItemId);
        await setDoc(docRef, sanitizeForFirestore<ChecklistItem>(newItem));

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore addChecklistItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menambah item senarai semak ke Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }

      return newItemId;
    },
    [user, activeStay]
  );

  const toggleChecklistComplete = useCallback(
    async (id: string) => {
      if (!activeStay) return;

      const existing = userChecklistItems.find((i) => i.id === id) || SHOWCASE_CHECKLIST_ITEMS.find((i) => i.id === id);
      if (!existing) return;
      const nextCompleted = !existing.isCompleted;
      const now = Date.now();

      // Optimistic update
      setUserChecklistItems((prev) => {
        const found = prev.some((c) => c.id === id);
        if (found) {
          return prev.map((c) => (c.id === id ? { ...c, isCompleted: nextCompleted, updatedAt: now } : c));
        } else {
          return [...prev, { ...existing, isCompleted: nextCompleted, updatedAt: now }];
        }
      });

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'stays', activeStay.id, 'checklistItems', id);
        await setDoc(itemRef, { ...existing, isCompleted: nextCompleted, updatedAt: now }, { merge: true });

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore toggleChecklistComplete error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini item senarai semak di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeStay, userChecklistItems]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      if (!activeStay) return;

      // Optimistic removal
      setUserChecklistItems((prev) => prev.filter((c) => c.id !== id));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'stays', activeStay.id, 'checklistItems', id);
        await deleteDoc(itemRef);

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore deleteChecklistItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal memadam item senarai semak di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeStay]
  );

  const createFromStarterTemplate = useCallback(
    async (templateType: StayType): Promise<string> => {
      let title = 'Pelan Percutian Saya';
      let durationDays = 3;
      let location = 'Destinasi Pilihan';

      if (templateType === 'balik_kampung') {
        title = 'Kepulangan Balik Kampung';
        durationDays = 3;
        location = 'Kampung Halaman';
      } else if (templateType === 'homestay') {
        title = 'Percutian Santai Homestay';
        durationDays = 3;
        location = 'Homestay Percutian';
      } else if (templateType === 'weekend_getaway') {
        title = 'Rehat Hujung Minggu (Weekend Getaway)';
        durationDays = 2;
        location = 'Resort / Staycation';
      }

      const startDate = getLocalTodayDate();
      const endDate = getLocalDateWithOffset(durationDays - 1, startDate);

      return await addStay({
        title,
        type: templateType,
        startDate,
        endDate,
        durationDays,
        location,
        companions: [],
        houseRules: []
      });
    },
    [addStay]
  );

  // ----------------------------------------------------------------------------------
  // 5. DATA SAFETY & PORTABILITY ENGINE (SES v4.4 Locked)
  // ----------------------------------------------------------------------------------

  const importCsvRows = useCallback(
    async (
      rows: ValidatedCsvRow[],
      defaultStayId?: string,
      onProgress?: (msg: string) => void
    ): Promise<{ success: boolean; importedCount: number; message: string }> => {
      const validRows = rows.filter((r) => r.status === 'valid');
      if (validRows.length === 0) {
        return { success: false, importedCount: 0, message: 'Tiada rekod sah untuk diimport.' };
      }

      const now = Date.now();
      const currentUid = user?.uid || 'admin_device';
      setIsSyncing(true);
      setSyncStatus('SAVING');

      try {
        onProgress?.('Menyediakan pangkalan data...');
        const batch = writeBatch(db);

        // Map to keep track of stay IDs by title
        const stayTitleToId = new Map<string, string>();
        userStays.forEach((s) => stayTitleToId.set(normalizeText(s.title), s.id));

        const newStays: Stay[] = [];
        const newAgendas: AgendaItem[] = [];
        const newChecklists: ChecklistItem[] = [];

        // 1. Process STAY records first
        for (const row of validRows) {
          if (row.recordType === 'STAY') {
            const stayTitle = row.itemTitle || row.stayTitle;
            const normTitle = normalizeText(stayTitle);
            if (!stayTitleToId.has(normTitle)) {
              const stayId = `stay_${now}_${Math.random().toString(36).substring(2, 7)}`;
              stayTitleToId.set(normTitle, stayId);

              const newStay: Stay = {
                id: stayId,
                userId: currentUid,
                title: stayTitle,
                type: row.stayType || 'homestay',
                startDate: row.startDate || getLocalTodayDate(),
                endDate: row.endDate || getLocalDateWithOffset(2),
                durationDays: 3,
                location: row.locationName || 'Destinasi',
                address: row.address,
                companions: row.companions || [],
                houseRules: row.houseRules || [],
                importantNotes: row.descriptionNotes,
                createdAt: now,
                updatedAt: now
              };

              newStays.push(newStay);
              const stayDocRef = doc(db, 'stays', stayId);
              batch.set(stayDocRef, sanitizeForFirestore<Stay>(newStay));
            }
          }
        }

        // 2. Process ACTIVITY & CHECKLIST records
        let itemIndex = 0;
        for (const row of validRows) {
          itemIndex++;
          const targetStayTitle = normalizeText(row.stayTitle);
          let targetStayId = stayTitleToId.get(targetStayTitle) || defaultStayId || (userStays[0]?.id) || (newStays[0]?.id);

          // If no stay exists at all, create an encompassing stay for imported items
          if (!targetStayId) {
            targetStayId = `stay_${now}_${Math.random().toString(36).substring(2, 7)}`;
            stayTitleToId.set(targetStayTitle || 'rancangan diimport', targetStayId);

            const fallbackStay: Stay = {
              id: targetStayId,
              userId: currentUid,
              title: row.stayTitle || 'Rancangan Diimport',
              type: 'homestay',
              startDate: getLocalTodayDate(),
              endDate: getLocalDateWithOffset(2),
              durationDays: 3,
              location: row.locationName || 'Destinasi',
              companions: [],
              houseRules: [],
              createdAt: now,
              updatedAt: now
            };

            newStays.push(fallbackStay);
            const stayDocRef = doc(db, 'stays', targetStayId);
            batch.set(stayDocRef, sanitizeForFirestore<Stay>(fallbackStay));
          }

          if (row.recordType === 'ACTIVITY') {
            const agnId = `agn_${now}_${itemIndex}_${Math.random().toString(36).substring(2, 6)}`;
            const newAgenda: AgendaItem = {
              id: agnId,
              stayId: targetStayId,
              userId: currentUid,
              dayNumber: row.dayNumber ?? 0,
              timeSlot: row.timeSlot || 'flexible',
              timeSpecific: row.timeSpecific,
              title: row.itemTitle,
              priority: row.priority || 'must_do',
              locationName: row.locationName,
              personInCharge: row.personInCharge,
              description: row.descriptionNotes,
              isCompleted: row.isCompleted,
              createdAt: now,
              updatedAt: now
            };

            newAgendas.push(newAgenda);
            const docRef = doc(collection(db, 'stays', targetStayId, 'agendaItems'), agnId);
            batch.set(docRef, sanitizeForFirestore<AgendaItem>(newAgenda));
          } else if (row.recordType === 'CHECKLIST') {
            const chkId = `chk_${now}_${itemIndex}_${Math.random().toString(36).substring(2, 6)}`;
            const newChecklist: ChecklistItem = {
              id: chkId,
              stayId: targetStayId,
              userId: currentUid,
              category: row.category || 'essentials',
              text: row.itemTitle,
              isCompleted: row.isCompleted,
              createdAt: now,
              updatedAt: now
            };

            newChecklists.push(newChecklist);
            const docRef = doc(collection(db, 'stays', targetStayId, 'checklistItems'), chkId);
            batch.set(docRef, sanitizeForFirestore<ChecklistItem>(newChecklist));
          }
        }

        onProgress?.('Menulis rekod ke Cloud Firestore...');
        await batch.commit();

        // Update local React state
        if (newStays.length > 0) {
          setUserStays((prev) => [...newStays, ...prev]);
          if (!activeStayId) {
            setActiveStayIdState(newStays[0].id);
          }
        }
        if (newAgendas.length > 0) {
          setUserAgendaItems((prev) => [...prev, ...newAgendas]);
        }
        if (newChecklists.length > 0) {
          setUserChecklistItems((prev) => [...prev, ...newChecklists]);
        }

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);

        return {
          success: true,
          importedCount: validRows.length,
          message: `Berjaya mengimport ${validRows.length} rekod ke dalam MyStay.`
        };
      } catch (err: any) {
        console.error('Import CSV error:', err);
        setSyncStatus('ERROR');
        setSyncError(err?.message || 'Gagal mengimport rekod CSV.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, userStays, activeStayId]
  );

  const restoreDataBackup = useCallback(
    async (payload: MyStayBackupPayload): Promise<{ success: boolean; message: string }> => {
      const { stays: backupStays, agendaItems: backupAgendas, checklistItems: backupChecklists, activeStayId: backupActiveId } = payload.data;

      setIsSyncing(true);
      setSyncStatus('SAVING');

      try {
        const batch = writeBatch(db);

        // 1. Write Stays
        for (const stay of backupStays) {
          const stayRef = doc(db, 'stays', stay.id);
          batch.set(stayRef, sanitizeForFirestore<Stay>(stay));
        }

        // 2. Write Agendas
        for (const agenda of backupAgendas) {
          const agendaRef = doc(collection(db, 'stays', agenda.stayId, 'agendaItems'), agenda.id);
          batch.set(agendaRef, sanitizeForFirestore<AgendaItem>(agenda));
        }

        // 3. Write Checklists
        for (const chk of backupChecklists) {
          const chkRef = doc(collection(db, 'stays', chk.stayId, 'checklistItems'), chk.id);
          batch.set(chkRef, sanitizeForFirestore<ChecklistItem>(chk));
        }

        await batch.commit();

        // Update local state
        setUserStays(backupStays);
        setUserAgendaItems(backupAgendas);
        setUserChecklistItems(backupChecklists);
        if (backupActiveId) {
          setActiveStayIdState(backupActiveId);
        } else if (backupStays.length > 0) {
          setActiveStayIdState(backupStays[0].id);
        }

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);

        return {
          success: true,
          message: `Berjaya memulihkan data sandaran (${backupStays.length} rancangan, ${backupAgendas.length} aktiviti, ${backupChecklists.length} senarai semak).`
        };
      } catch (err: any) {
        console.error('Restore data backup error:', err);
        setSyncStatus('ERROR');
        setSyncError(err?.message || 'Gagal memulihkan data sandaran.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const deleteDuplicateItems = useCallback(
    async (duplicateIds: {
      agendaIds: string[];
      checklistIds: string[];
      stayIds: string[];
    }): Promise<{ success: boolean; message: string }> => {
      const { agendaIds, checklistIds, stayIds } = duplicateIds;
      const totalCount = agendaIds.length + checklistIds.length + stayIds.length;
      if (totalCount === 0) {
        return { success: true, message: 'Tiada item duplikasi yang dipilih.' };
      }

      setIsSyncing(true);
      setSyncStatus('SAVING');

      try {
        const batch = writeBatch(db);

        // 1. Delete agenda duplicates
        for (const id of agendaIds) {
          const item = userAgendaItems.find((a) => a.id === id);
          if (item) {
            const itemRef = doc(db, 'stays', item.stayId, 'agendaItems', id);
            batch.delete(itemRef);
          }
        }

        // 2. Delete checklist duplicates
        for (const id of checklistIds) {
          const item = userChecklistItems.find((c) => c.id === id);
          if (item) {
            const itemRef = doc(db, 'stays', item.stayId, 'checklistItems', id);
            batch.delete(itemRef);
          }
        }

        // 3. Delete stay duplicates
        for (const id of stayIds) {
          batch.delete(doc(db, 'stays', id));
        }

        await batch.commit();

        // Update local state
        const agendaIdSet = new Set(agendaIds);
        const checklistIdSet = new Set(checklistIds);
        const stayIdSet = new Set(stayIds);

        setUserAgendaItems((prev) => prev.filter((a) => !agendaIdSet.has(a.id)));
        setUserChecklistItems((prev) => prev.filter((c) => !checklistIdSet.has(c.id)));
        setUserStays((prev) => {
          const filtered = prev.filter((s) => !stayIdSet.has(s.id));
          if (activeStayId && stayIdSet.has(activeStayId)) {
            setActiveStayIdState(filtered.length > 0 ? filtered[0].id : null);
          }
          return filtered;
        });

        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);

        return {
          success: true,
          message: `Berjaya membersihkan ${totalCount} rekod duplikasi yang dipilih.`
        };
      } catch (err: any) {
        console.error('Delete duplicate items error:', err);
        setSyncStatus('ERROR');
        setSyncError(err?.message || 'Gagal membersihkan rekod duplikasi.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [userAgendaItems, userChecklistItems, activeStayId]
  );

  const exportDataJson = useCallback((): string => {
    return JSON.stringify(
      {
        version: '4.4',
        appName: 'MyStay',
        exportedAt: new Date().toISOString(),
        timestamp: Date.now(),
        data: {
          stays,
          agendaItems: userAgendaItems.length > 0 ? userAgendaItems : SHOWCASE_AGENDA_ITEMS,
          checklistItems: userChecklistItems.length > 0 ? userChecklistItems : SHOWCASE_CHECKLIST_ITEMS,
          activeStayId
        }
      },
      null,
      2
    );
  }, [stays, userAgendaItems, userChecklistItems, activeStayId]);

  return (
    <StayContext.Provider
      value={{
        stays,
        activeStay,
        activeStayId,
        setActiveStayId,
        agendaItems: userAgendaItems.length > 0 ? userAgendaItems : SHOWCASE_AGENDA_ITEMS,
        activeAgendaItems,
        checklistItems: userChecklistItems.length > 0 ? userChecklistItems : SHOWCASE_CHECKLIST_ITEMS,
        activeChecklistItems,
        isPersonalMode,
        isLoadingStays,
        isSyncing,
        syncStatus,
        lastSyncTime,
        syncError,
        hasUnsavedChanges,
        unsavedCount,
        saveFeedback,
        saveAndSync,
        refreshFromCloud,
        forceSyncWithCloud,
        markChangesMade,
        clearSaveFeedback,
        addStay,
        updateStay,
        deleteStay,
        duplicateStay,
        addAgendaItem,
        updateAgendaItem,
        batchUpdateAgendaItems,
        deleteAgendaItem,
        toggleAgendaComplete,
        addChecklistItem,
        toggleChecklistComplete,
        deleteChecklistItem,
        createFromStarterTemplate,
        exportDataJson,
        importCsvRows,
        restoreDataBackup,
        deleteDuplicateItems
      }}
    >
      {children}
    </StayContext.Provider>
  );
};

export const useStay = () => {
  const context = useContext(StayContext);
  if (!context) {
    throw new Error('useStay must be used within a StayProvider');
  }
  return context;
};
