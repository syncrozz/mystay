import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Stay, AgendaItem, ChecklistItem, StayType, SyncStatus, ActivityLibraryItem } from '../types';
import { SHOWCASE_STAYS, SHOWCASE_AGENDA_ITEMS, SHOWCASE_CHECKLIST_ITEMS } from '../data/defaultStays';
import { getLocalTodayDate, getLocalDateWithOffset } from '../utils/formatters';
import { DEFAULT_ACTIVITY_LIBRARY_SEEDS } from '../utils/constants';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { ValidatedCsvRow, MyStayBackupPayload, normalizeText } from '../utils/dataSafety';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
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
  activityLibraryItems: ActivityLibraryItem[];
  isLoadingLibrary: boolean;
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
  addActivityLibraryItem: (item: { name: string; emoji?: string; sortOrder?: number }) => Promise<string>;
  updateActivityLibraryItem: (id: string, updates: Partial<ActivityLibraryItem>) => Promise<void>;
  deleteActivityLibraryItem: (id: string) => Promise<void>;
  reorderActivityLibraryItems: (items: ActivityLibraryItem[]) => Promise<void>;
  seedDefaultActivityLibrary: () => Promise<void>;
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

/**
 * Sanitizes object by removing `undefined` values recursively so Firestore never errors.
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

// Deep comparison helpers to avoid redundant React state reference replacements
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

function areLibraryListsEqual(a: ActivityLibraryItem[], b: ActivityLibraryItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const l1 = a[i];
    const l2 = b[i];
    if (
      l1.id !== l2.id ||
      l1.name !== l2.name ||
      l1.emoji !== l2.emoji ||
      l1.sortOrder !== l2.sortOrder ||
      l1.isActive !== l2.isActive ||
      l1.updatedAt !== l2.updatedAt
    ) {
      return false;
    }
  }
  return true;
}

// Storage cache key generator scoped strictly to authenticated UID or guest session
const getScopedCacheKey = (type: 'stays' | 'agenda' | 'checklist' | 'active_id' | 'activity_library', uid: string | null | undefined): string => {
  const scope = uid ? `usr_${uid}` : 'guest';
  return `stayplan_cached_${type}_v6_${scope}`;
};

const getInitialCachedStays = (uid: string | null | undefined): Stay[] => {
  try {
    const raw = localStorage.getItem(getScopedCacheKey('stays', uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: any) => s && !s.id?.startsWith('showcase-') && !s.title?.startsWith('Contoh:'));
      }
    }
  } catch {}
  return [];
};

const getInitialCachedAgenda = (uid: string | null | undefined): AgendaItem[] => {
  try {
    const raw = localStorage.getItem(getScopedCacheKey('agenda', uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a: any) => a && !a.id?.startsWith('showcase-'));
      }
    }
  } catch {}
  return [];
};

const getInitialCachedChecklist = (uid: string | null | undefined): ChecklistItem[] => {
  try {
    const raw = localStorage.getItem(getScopedCacheKey('checklist', uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c: any) => c && !c.id?.startsWith('showcase-'));
      }
    }
  } catch {}
  return [];
};

const getInitialCachedLibrary = (uid: string | null | undefined): ActivityLibraryItem[] => {
  try {
    const raw = localStorage.getItem(getScopedCacheKey('activity_library', uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
};

const getInitialCachedActiveStayId = (uid: string | null | undefined): string | null => {
  try {
    const raw = localStorage.getItem(getScopedCacheKey('active_id', uid));
    if (raw && !raw.startsWith('showcase-')) return raw;
  } catch {}
  return null;
};

export const StayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Instant offline-first state initialization from UID-scoped cache
  const [userStays, setUserStays] = useState<Stay[]>(() => getInitialCachedStays(user?.uid));
  const [userAgendaItems, setUserAgendaItems] = useState<AgendaItem[]>(() => getInitialCachedAgenda(user?.uid));
  const [userChecklistItems, setUserChecklistItems] = useState<ChecklistItem[]>(() => getInitialCachedChecklist(user?.uid));
  const [userLibraryItems, setUserLibraryItems] = useState<ActivityLibraryItem[]>(() => getInitialCachedLibrary(user?.uid));
  const [activeStayId, setActiveStayIdState] = useState<string | null>(() => getInitialCachedActiveStayId(user?.uid));

  // Non-blocking loading indicator
  const [isLoadingStays, setIsLoadingStays] = useState<boolean>(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (navigator.onLine ? 'SYNCED' : 'OFFLINE'));
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => Date.now());
  const [syncError, setSyncError] = useState<string | null>(null);

  // Health and realtime listener status references
  const staysListenerActiveRef = useRef<boolean>(false);
  const subcollectionsListenerActiveRef = useRef<boolean>(false);
  const hasPendingWritesRef = useRef<boolean>(false);

  // Unsaved changes & feedback
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [unsavedCount, setUnsavedCount] = useState<number>(0);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null>(null);

  const isPersonalMode = true;

  // Re-hydrate state from isolated user cache on account switch or logout
  useEffect(() => {
    const currentUid = user?.uid || null;
    const scopedStays = getInitialCachedStays(currentUid);
    const scopedAgenda = getInitialCachedAgenda(currentUid);
    const scopedChecklist = getInitialCachedChecklist(currentUid);
    const scopedLibrary = getInitialCachedLibrary(currentUid);
    const scopedActiveId = getInitialCachedActiveStayId(currentUid);

    setUserStays(scopedStays);
    setUserAgendaItems(scopedAgenda);
    setUserChecklistItems(scopedChecklist);
    setUserLibraryItems(scopedLibrary);
    setActiveStayIdState(scopedActiveId || (scopedStays.length > 0 ? scopedStays[0].id : null));

    // Clear any obsolete un-scoped legacy keys to prevent cross-account leakage
    try {
      localStorage.removeItem('stayplan_cached_stays_v5');
      localStorage.removeItem('stayplan_cached_agenda_v5');
      localStorage.removeItem('stayplan_cached_checklist_v5');
      localStorage.removeItem('stayplan_cached_active_id_v5');
    } catch {}
  }, [user?.uid]);

  // Safe migration of existing legacy drafts into newly authenticated Google account
  useEffect(() => {
    if (!user?.uid) return;

    try {
      const guestKey = getScopedCacheKey('stays', null);
      const rawGuestStays = localStorage.getItem(guestKey) || localStorage.getItem('stayplan_cached_stays_v5');
      if (rawGuestStays) {
        const parsedGuestStays: Stay[] = JSON.parse(rawGuestStays);
        if (Array.isArray(parsedGuestStays) && parsedGuestStays.length > 0) {
          // Strictly filter ONLY unassigned local/guest drafts to prevent claiming foreign user records
          const eligibleGuestDrafts = parsedGuestStays.filter(
            (s) => !s.userId || s.userId === 'local_user' || s.userId === 'guest' || s.userId === 'admin_device'
          );

          if (eligibleGuestDrafts.length > 0) {
            setUserStays((prev) => {
              // Only adopt if the user currently has no stays (fresh account) to prevent overwriting cloud records
              if (prev.length === 0) {
                const now = Date.now();
                const migratedStays = eligibleGuestDrafts.map((s) => ({
                  ...s,
                  userId: user.uid,
                  updatedAt: now
                }));
                const batch = writeBatch(db);
                migratedStays.forEach((s) => {
                  const stayDocRef = doc(db, 'stays', s.id);
                  batch.set(stayDocRef, sanitizeForFirestore<Stay>(s));
                });
                batch.commit().catch((err) => console.warn('Guest migration commit notice:', err));
                return migratedStays;
              }
              return prev;
            });
          }
          // Clean up legacy guest keys after evaluation
          localStorage.removeItem(guestKey);
          localStorage.removeItem('stayplan_cached_stays_v5');
          localStorage.removeItem('stayplan_cached_agenda_v5');
          localStorage.removeItem('stayplan_cached_checklist_v5');
        }
      }
    } catch (e) {
      console.warn('Guest migration audit notice:', e);
    }
  }, [user?.uid]);

  // Persist cache strictly to UID-scoped local storage keys
  useEffect(() => {
    try {
      const key = getScopedCacheKey('stays', user?.uid);
      localStorage.setItem(key, JSON.stringify(userStays));
    } catch {}
  }, [userStays, user?.uid]);

  useEffect(() => {
    try {
      const key = getScopedCacheKey('agenda', user?.uid);
      localStorage.setItem(key, JSON.stringify(userAgendaItems));
    } catch {}
  }, [userAgendaItems, user?.uid]);

  useEffect(() => {
    try {
      const key = getScopedCacheKey('checklist', user?.uid);
      localStorage.setItem(key, JSON.stringify(userChecklistItems));
    } catch {}
  }, [userChecklistItems, user?.uid]);

  useEffect(() => {
    try {
      const key = getScopedCacheKey('activity_library', user?.uid);
      localStorage.setItem(key, JSON.stringify(userLibraryItems));
    } catch {}
  }, [userLibraryItems, user?.uid]);

  useEffect(() => {
    try {
      const key = getScopedCacheKey('active_id', user?.uid);
      if (activeStayId) {
        localStorage.setItem(key, activeStayId);
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
  }, [activeStayId, user?.uid]);

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

  const markChangesMade = useCallback(() => {}, []);
  const clearSaveFeedback = useCallback(() => {
    setSaveFeedback(null);
  }, []);

  // ----------------------------------------------------------------------------------
  // 1. REFRESH FROM CLOUD (Authoritative Firestore Query Revalidation with User Isolation)
  // ----------------------------------------------------------------------------------
  const refreshFromCloud = useCallback(
    async (options?: { forceFetch?: boolean }): Promise<{ success: boolean; message: string; staysCount: number }> => {
      if (!navigator.onLine) {
        setSyncStatus('OFFLINE');
        return { success: false, message: 'Peranti anda sedang di luar talian (Offline).', staysCount: userStays.length };
      }

      if (!user?.uid) {
        return { success: true, message: 'Menunggu pengesahan pengguna...', staysCount: userStays.length };
      }

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

        // Authoritative query strictly isolated by owner UID
        const staysQuery = query(
          collection(db, 'stays'),
          where('userId', '==', user.uid)
        );
        const staysSnap = await getDocs(staysQuery);

        const fetchedStays: Stay[] = [];
        staysSnap.forEach((docSnap) => {
          const s = docSnap.data() as Stay;
          if (s && !s.id?.startsWith('showcase-') && !s.title?.startsWith('Contoh:')) {
            fetchedStays.push({ ...s, userId: user.uid });
          }
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
          agendaSnap.forEach((d) => fetchedAgendas.push({ ...(d.data() as AgendaItem), userId: user.uid }));

          const fetchedChecklists: ChecklistItem[] = [];
          checklistSnap.forEach((d) => fetchedChecklists.push({ ...(d.data() as ChecklistItem), userId: user.uid }));

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
    [user, activeStayId, userStays]
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
  // 2. DATA SUBSCRIPTION & HYDRATION (Authoritative Realtime Listener with User Isolation)
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!user?.uid) return;

    // Load initial active stay id from scoped cache
    try {
      const savedActivePref = localStorage.getItem(getScopedCacheKey('active_id', user.uid));
      if (savedActivePref) {
        setActiveStayIdState(savedActivePref);
      }
    } catch {}

    // Strict user ownership query: User only listens to stays they own
    const staysQuery = query(
      collection(db, 'stays'),
      where('userId', '==', user.uid)
    );

    const unsubscribeStays = onSnapshot(
      staysQuery,
      (snapshot) => {
        staysListenerActiveRef.current = true;
        hasPendingWritesRef.current = snapshot.metadata.hasPendingWrites;

        const fetchedStays: Stay[] = [];
        snapshot.forEach((docSnap) => {
          const s = docSnap.data() as Stay;
          if (s && !s.id?.startsWith('showcase-') && !s.title?.startsWith('Contoh:')) {
            fetchedStays.push({ ...s, userId: user.uid });
          }
        });

        fetchedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (fetchedStays.length > 0) {
          setUserStays((prev) => (areStaysEqual(prev, fetchedStays) ? prev : fetchedStays));

          setActiveStayIdState((prevActiveId) => {
            if (prevActiveId && fetchedStays.some((s) => s.id === prevActiveId)) {
              return prevActiveId;
            }
            const nextId = fetchedStays[0].id;
            try {
              localStorage.setItem(getScopedCacheKey('active_id', user.uid), nextId);
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
  }, [user?.uid]);

  // ----------------------------------------------------------------------------------
  // 3. REALTIME SUBSCRIPTION FOR ACTIVE STAY'S SUBCOLLECTIONS
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!activeStayId || !user?.uid) {
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
        snapshot.forEach((d) => items.push({ ...(d.data() as AgendaItem), userId: user.uid }));

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
        snapshot.forEach((d) => items.push({ ...(d.data() as ChecklistItem), userId: user.uid }));

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
  }, [activeStayId, user?.uid]);

  // ----------------------------------------------------------------------------------
  // REALTIME SUBSCRIPTION FOR USER'S ACTIVITY LIBRARY (AUTHORITATIVE PER UID)
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!user?.uid) {
      setUserLibraryItems([]);
      setIsLoadingLibrary(false);
      return;
    }

    setIsLoadingLibrary(true);
    const libRef = collection(db, 'users', user.uid, 'activityLibrary');

    const unsubscribeLib = onSnapshot(
      libRef,
      (snapshot) => {
        const items: ActivityLibraryItem[] = [];
        snapshot.forEach((docSnap) => {
          const item = docSnap.data() as ActivityLibraryItem;
          if (item && item.id) {
            items.push({ ...item, userId: user.uid });
          }
        });

        items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.createdAt || 0) - (b.createdAt || 0));

        setUserLibraryItems((prev) => (areLibraryListsEqual(prev, items) ? prev : items));
        setIsLoadingLibrary(false);
      },
      (error) => {
        console.warn('Activity library subscription notice:', error);
        setIsLoadingLibrary(false);
      }
    );

    return () => {
      unsubscribeLib();
    };
  }, [user?.uid]);

  // Active stay data selectors
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
      localStorage.setItem(getScopedCacheKey('active_id', user?.uid), id);
    } catch {}
  };

  // ----------------------------------------------------------------------------------
  // 4. FIRESTORE WRITE MUTATIONS WITH ERROR HANDLING
  // ----------------------------------------------------------------------------------

  const addStay = useCallback(
    async (newStayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> => {
      const stayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'local_user';
      const newStay: Stay = {
        ...newStayData,
        id: stayId,
        userId: currentUid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic update
      setUserStays((prev) => [newStay, ...prev]);
      setActiveStayIdState(stayId);

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.CREATE, `stays/${stayId}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
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

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.UPDATE, `stays/${id}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user]
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

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.DELETE, `stays/${id}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user]
  );

  const duplicateStay = useCallback(
    async (id: string) => {
      const target = userStays.find((s) => s.id === id) || SHOWCASE_STAYS.find((s) => s.id === id);
      if (!target) return;

      const newStayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'local_user';
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

      setUserStays((prev) => [duplicatedStay, ...prev]);
      setUserAgendaItems((prev) => [...prev, ...dupAgendas]);
      setUserChecklistItems((prev) => [...prev, ...dupChecklists]);
      setActiveStayIdState(newStayId);

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.WRITE, `stays/${newStayId}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user, userStays, userAgendaItems, userChecklistItems]
  );

  const addAgendaItem = useCallback(
    async (item: Omit<AgendaItem, 'id' | 'userId'>): Promise<string> => {
      if (!activeStay) return '';

      const newItemId = `agn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'local_user';
      const newItem: AgendaItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: currentUid,
        priority: item.priority || 'undecided',
        createdAt: now,
        updatedAt: now
      };

      setUserAgendaItems((prev) => [...prev, newItem]);

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.CREATE, `stays/${activeStay.id}/agendaItems/${newItemId}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
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

      setUserAgendaItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a)));

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.UPDATE, `stays/${activeStay.id}/agendaItems/${id}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user, activeStay]
  );

  const batchUpdateAgendaItems = useCallback(
    async (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => {
      if (!activeStay || updatesList.length === 0) return;

      const now = Date.now();
      const updateMap = new Map(updatesList.map((u) => [u.id, u.updates]));

      setUserAgendaItems((prev) =>
        prev.map((a) => {
          const up = updateMap.get(a.id);
          return up ? { ...a, ...up, updatedAt: now } : a;
        })
      );

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.WRITE, `stays/${activeStay.id}/agendaItems`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user, activeStay]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!activeStay) return;

      setUserAgendaItems((prev) => prev.filter((a) => a.id !== id));

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.DELETE, `stays/${activeStay.id}/agendaItems/${id}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user, activeStay]
  );

  const toggleAgendaComplete = useCallback(
    async (id: string) => {
      if (!activeStay) return;

      const existing = userAgendaItems.find((i) => i.id === id) || SHOWCASE_AGENDA_ITEMS.find((i) => i.id === id);
      if (!existing) return;
      const nextCompleted = !existing.isCompleted;
      const now = Date.now();

      setUserAgendaItems((prev) => {
        const found = prev.some((a) => a.id === id);
        if (found) {
          return prev.map((a) => (a.id === id ? { ...a, isCompleted: nextCompleted, updatedAt: now } : a));
        } else {
          return [...prev, { ...existing, isCompleted: nextCompleted, updatedAt: now }];
        }
      });

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.UPDATE, `stays/${activeStay.id}/agendaItems/${id}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user, activeStay, userAgendaItems]
  );

  const addChecklistItem = useCallback(
    async (item: Omit<ChecklistItem, 'id' | 'userId'>): Promise<string> => {
      if (!activeStay) return '';

      const newItemId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'local_user';
      const newItem: ChecklistItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: currentUid,
        createdAt: now,
        updatedAt: now
      };

      setUserChecklistItems((prev) => [...prev, newItem]);

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.CREATE, `stays/${activeStay.id}/checklistItems/${newItemId}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
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

      setUserChecklistItems((prev) => {
        const found = prev.some((c) => c.id === id);
        if (found) {
          return prev.map((c) => (c.id === id ? { ...c, isCompleted: nextCompleted, updatedAt: now } : c));
        } else {
          return [...prev, { ...existing, isCompleted: nextCompleted, updatedAt: now }];
        }
      });

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.UPDATE, `stays/${activeStay.id}/checklistItems/${id}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user, activeStay, userChecklistItems]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      if (!activeStay) return;

      setUserChecklistItems((prev) => prev.filter((c) => c.id !== id));

      if (user?.uid) {
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
          handleFirestoreError(err, OperationType.DELETE, `stays/${activeStay.id}/checklistItems/${id}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
      }
    },
    [user, activeStay]
  );

  // ----------------------------------------------------------------------------------
  // 5. ACTIVITY LIBRARY CRUD OPERATIONS (PERSONAL REUSABLE ACTIVITIES)
  // ----------------------------------------------------------------------------------

  const addActivityLibraryItem = useCallback(
    async (item: { name: string; emoji?: string; sortOrder?: number }): Promise<string> => {
      const trimmedName = item.name.trim();
      if (!trimmedName) return '';

      const newId = `lib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const currentUid = user?.uid || 'local_user';
      const newItem: ActivityLibraryItem = {
        id: newId,
        userId: currentUid,
        name: trimmedName,
        emoji: item.emoji || '📌',
        sortOrder: item.sortOrder ?? (userLibraryItems.length + 1),
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      setUserLibraryItems((prev) => [...prev, newItem]);

      if (user?.uid) {
        try {
          const docRef = doc(db, 'users', user.uid, 'activityLibrary', newId);
          await setDoc(docRef, sanitizeForFirestore<ActivityLibraryItem>(newItem));
        } catch (err: any) {
          console.error('Error adding activity library item:', err);
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/activityLibrary/${newId}`);
        }
      }

      return newId;
    },
    [user?.uid, userLibraryItems.length]
  );

  const updateActivityLibraryItem = useCallback(
    async (id: string, updates: Partial<ActivityLibraryItem>): Promise<void> => {
      const now = Date.now();
      setUserLibraryItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: now } : item))
      );

      if (user?.uid) {
        try {
          const docRef = doc(db, 'users', user.uid, 'activityLibrary', id);
          await updateDoc(docRef, sanitizeForFirestore({ ...updates, updatedAt: now }));
        } catch (err: any) {
          console.error('Error updating activity library item:', err);
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/activityLibrary/${id}`);
        }
      }
    },
    [user?.uid]
  );

  const deleteActivityLibraryItem = useCallback(
    async (id: string): Promise<void> => {
      setUserLibraryItems((prev) => prev.filter((item) => item.id !== id));

      if (user?.uid) {
        try {
          const docRef = doc(db, 'users', user.uid, 'activityLibrary', id);
          await deleteDoc(docRef);
        } catch (err: any) {
          console.error('Error deleting activity library item:', err);
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/activityLibrary/${id}`);
        }
      }
    },
    [user?.uid]
  );

  const reorderActivityLibraryItems = useCallback(
    async (items: ActivityLibraryItem[]): Promise<void> => {
      const now = Date.now();
      const updated = items.map((item, index) => ({
        ...item,
        sortOrder: index + 1,
        updatedAt: now
      }));

      setUserLibraryItems(updated);

      if (user?.uid) {
        try {
          const batch = writeBatch(db);
          updated.forEach((item) => {
            const docRef = doc(db, 'users', user.uid, 'activityLibrary', item.id);
            batch.update(docRef, { sortOrder: item.sortOrder, updatedAt: item.updatedAt });
          });
          await batch.commit();
        } catch (err: any) {
          console.error('Error reordering activity library:', err);
        }
      }
    },
    [user?.uid]
  );

  const seedDefaultActivityLibrary = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;
    const now = Date.now();
    const batch = writeBatch(db);
    const newItems: ActivityLibraryItem[] = [];

    DEFAULT_ACTIVITY_LIBRARY_SEEDS.forEach((seed, index) => {
      const id = `lib_${now}_${index}_${Math.random().toString(36).substring(2, 6)}`;
      const item: ActivityLibraryItem = {
        id,
        userId: user.uid,
        name: seed.name,
        emoji: seed.emoji,
        sortOrder: index + 1,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      newItems.push(item);
      const docRef = doc(db, 'users', user.uid, 'activityLibrary', id);
      batch.set(docRef, sanitizeForFirestore<ActivityLibraryItem>(item));
    });

    setUserLibraryItems(newItems);
    try {
      await batch.commit();
    } catch (err: any) {
      console.error('Error seeding default activity library:', err);
    }
  }, [user?.uid]);

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
      const currentUid = user?.uid || 'temp_user';
      setIsSyncing(true);
      setSyncStatus('SAVING');

      try {
        onProgress?.('Menyediakan pangkalan data...');
        const batch = writeBatch(db);

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
          message: `Berjaya mengimport ${validRows.length} rekod ke dalam StayPlan.`
        };
      } catch (err: any) {
        console.error('Import CSV error:', err);
        setSyncStatus('ERROR');
        setSyncError(err?.message || 'Gagal mengimport rekod CSV.');
        handleFirestoreError(err, OperationType.WRITE, 'stays');
      } finally {
        setIsSyncing(false);
      }
    },
    [user, userStays, activeStayId]
  );

  const restoreDataBackup = useCallback(
    async (payload: MyStayBackupPayload): Promise<{ success: boolean; message: string }> => {
      const { stays: backupStays, agendaItems: backupAgendas, checklistItems: backupChecklists, activeStayId: backupActiveId } = payload.data;
      const currentUid = user?.uid || 'local_user';

      setIsSyncing(true);
      setSyncStatus('SAVING');

      try {
        if (user?.uid) {
          const batch = writeBatch(db);

          for (const stay of backupStays) {
            const stayRef = doc(db, 'stays', stay.id);
            batch.set(stayRef, sanitizeForFirestore<Stay>({ ...stay, userId: currentUid }));
          }

          for (const agenda of backupAgendas) {
            const agendaRef = doc(collection(db, 'stays', agenda.stayId, 'agendaItems'), agenda.id);
            batch.set(agendaRef, sanitizeForFirestore<AgendaItem>({ ...agenda, userId: currentUid }));
          }

          for (const chk of backupChecklists) {
            const chkRef = doc(collection(db, 'stays', chk.stayId, 'checklistItems'), chk.id);
            batch.set(chkRef, sanitizeForFirestore<ChecklistItem>({ ...chk, userId: currentUid }));
          }

          await batch.commit();
        }

        setUserStays(backupStays.map((s) => ({ ...s, userId: currentUid })));
        setUserAgendaItems(backupAgendas.map((a) => ({ ...a, userId: currentUid })));
        setUserChecklistItems(backupChecklists.map((c) => ({ ...c, userId: currentUid })));
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
        handleFirestoreError(err, OperationType.WRITE, 'stays');
      } finally {
        setIsSyncing(false);
      }
    },
    [user]
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
        if (user?.uid) {
          const batch = writeBatch(db);

          for (const id of agendaIds) {
            const item = userAgendaItems.find((a) => a.id === id);
            if (item) {
              const itemRef = doc(db, 'stays', item.stayId, 'agendaItems', id);
              batch.delete(itemRef);
            }
          }

          for (const id of checklistIds) {
            const item = userChecklistItems.find((c) => c.id === id);
            if (item) {
              const itemRef = doc(db, 'stays', item.stayId, 'checklistItems', id);
              batch.delete(itemRef);
            }
          }

          for (const id of stayIds) {
            batch.delete(doc(db, 'stays', id));
          }

          await batch.commit();
        }

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
        handleFirestoreError(err, OperationType.DELETE, 'stays');
      } finally {
        setIsSyncing(false);
      }
    },
    [userAgendaItems, userChecklistItems, activeStayId]
  );

  const exportDataJson = useCallback((): string => {
    return JSON.stringify(
      {
        version: '4.5',
        appName: 'StayPlan',
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
        activityLibraryItems: userLibraryItems,
        isLoadingLibrary,
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
        addActivityLibraryItem,
        updateActivityLibraryItem,
        deleteActivityLibraryItem,
        reorderActivityLibraryItems,
        seedDefaultActivityLibrary,
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
