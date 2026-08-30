import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Stay, AgendaItem, ChecklistItem, StayType, SyncStatus } from '../types';
import { SHOWCASE_STAYS, SHOWCASE_AGENDA_ITEMS, SHOWCASE_CHECKLIST_ITEMS } from '../data/defaultStays';
import { getLocalTodayDate, getLocalDateWithOffset } from '../utils/formatters';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
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

export const StayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isUnlocked, requireAuth } = useAuth();

  // State management
  const [userStays, setUserStays] = useState<Stay[]>([]);
  const [userAgendaItems, setUserAgendaItems] = useState<AgendaItem[]>([]);
  const [userChecklistItems, setUserChecklistItems] = useState<ChecklistItem[]>([]);
  const [activeStayId, setActiveStayIdState] = useState<string | null>(null);

  const [isLoadingStays, setIsLoadingStays] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (navigator.onLine ? 'SYNCED' : 'OFFLINE'));
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Health and realtime listener status references
  const staysListenerActiveRef = useRef<boolean>(false);
  const subcollectionsListenerActiveRef = useRef<boolean>(false);
  const hasPendingWritesRef = useRef<boolean>(false);

  // Unsaved changes & feedback
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [unsavedCount, setUnsavedCount] = useState<number>(0);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null>(null);

  const isPersonalMode = !!user && isUnlocked;

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
      if (!user) {
        return { success: false, message: 'Sila buka kunci StayPlan untuk memuat data.', staysCount: 0 };
      }

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

        // Fetch stays collection from Firestore
        const staysColRef = collection(db, 'users', user.uid, 'stays');
        const staysSnap = await getDocs(staysColRef);

        const fetchedStays: Stay[] = [];
        staysSnap.forEach((docSnap) => {
          fetchedStays.push(docSnap.data() as Stay);
        });

        fetchedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setUserStays((prev) => (areStaysEqual(prev, fetchedStays) ? prev : fetchedStays));

        // Determine active stay
        let currentActive = activeStayId;
        if (!currentActive || !fetchedStays.some((s) => s.id === currentActive)) {
          currentActive = fetchedStays.length > 0 ? fetchedStays[0].id : null;
          setActiveStayIdState(currentActive);
        }

        // Parallel fetch for active stay's subcollections
        if (currentActive) {
          const agendaColRef = collection(db, 'users', user.uid, 'stays', currentActive, 'agendaItems');
          const checklistColRef = collection(db, 'users', user.uid, 'stays', currentActive, 'checklistItems');

          const [agendaSnap, checklistSnap] = await Promise.all([
            getDocs(agendaColRef),
            getDocs(checklistColRef)
          ]);

          const fetchedAgendas: AgendaItem[] = [];
          agendaSnap.forEach((d) => fetchedAgendas.push(d.data() as AgendaItem));

          const fetchedChecklists: ChecklistItem[] = [];
          checklistSnap.forEach((d) => fetchedChecklists.push(d.data() as ChecklistItem));

          setUserAgendaItems((prev) => {
            const otherStays = prev.filter((i) => i.stayId !== currentActive);
            const merged = [...otherStays, ...fetchedAgendas];
            return areAgendaListsEqual(prev, merged) ? prev : merged;
          });

          setUserChecklistItems((prev) => {
            const otherStays = prev.filter((i) => i.stayId !== currentActive);
            const merged = [...otherStays, ...fetchedChecklists];
            return areChecklistListsEqual(prev, merged) ? prev : merged;
          });
        }

        const now = Date.now();
        setLastSyncTime(now);
        setSyncStatus('SYNCED');
        setHasUnsavedChanges(false);
        setUnsavedCount(0);

        return {
          success: true,
          message: `Berjaya memuat semula ${fetchedStays.length} stay dari Cloud.`,
          staysCount: fetchedStays.length
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
    [user, activeStayId, userStays.length]
  );

  const forceSyncWithCloud = refreshFromCloud;

  const saveAndSync = useCallback(
    async (customSuccessMsg?: string): Promise<{ success: boolean; message: string; staysCount: number }> => {
      if (!user) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk sync data.');
        return {
          success: false,
          message: 'Sila buka kunci StayPlan untuk sync.',
          staysCount: 0
        };
      }

      const res = await refreshFromCloud();
      if (res.success) {
        setSaveFeedback({
          type: 'success',
          message: customSuccessMsg || 'Data telah diselaraskan ke Cloud Firestore.',
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
    [user, refreshFromCloud, requireAuth]
  );

  // ----------------------------------------------------------------------------------
  // 2. DATA SUBSCRIPTION & HYDRATION (Authoritative Realtime Listener)
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!user) {
      setUserStays([]);
      setUserAgendaItems([]);
      setUserChecklistItems([]);
      setActiveStayIdState(SHOWCASE_STAYS[0]?.id || null);
      setIsLoadingStays(false);
      setSyncStatus('SYNCED');
      staysListenerActiveRef.current = false;
      return;
    }

    // AUTHENTICATED OWNER:
    // Firestore with persistent local cache will hydrate instantly from IndexedDB,
    // and continuously stream realtime cloud updates across devices.
    setIsLoadingStays(true);

    // Initial preference for active stay id if available
    try {
      const savedActivePref = localStorage.getItem(getUserActivePrefKey(user.uid));
      if (savedActivePref) {
        setActiveStayIdState(savedActivePref);
      }
    } catch {}

    const staysColRef = collection(db, 'users', user.uid, 'stays');

    // Realtime subscription to the owner's stays collection
    const unsubscribeStays = onSnapshot(
      staysColRef,
      (snapshot) => {
        staysListenerActiveRef.current = true;
        hasPendingWritesRef.current = snapshot.metadata.hasPendingWrites;

        const fetchedStays: Stay[] = [];
        snapshot.forEach((docSnap) => {
          fetchedStays.push(docSnap.data() as Stay);
        });

        fetchedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Diffing check: only set state if stays array actually changed
        setUserStays((prev) => (areStaysEqual(prev, fetchedStays) ? prev : fetchedStays));

        setActiveStayIdState((prevActiveId) => {
          if (fetchedStays.length === 0) {
            return null;
          }
          if (prevActiveId && fetchedStays.some((s) => s.id === prevActiveId)) {
            return prevActiveId;
          }
          const nextId = fetchedStays[0].id;
          try {
            localStorage.setItem(getUserActivePrefKey(user.uid), nextId);
          } catch {}
          return nextId;
        });

        setIsLoadingStays(false);
        setSyncStatus(navigator.onLine ? 'SYNCED' : 'OFFLINE');
        setLastSyncTime(Date.now());
        setSyncError(null);
      },
      (error) => {
        console.error('Firestore stays subscription error:', error);
        staysListenerActiveRef.current = false;
        setSyncError(error.message || 'Ralat sambungan Firestore');
        setSyncStatus('ERROR');
        setIsLoadingStays(false);
      }
    );

    return () => {
      staysListenerActiveRef.current = false;
      unsubscribeStays();
    };
  }, [user]);

  // ----------------------------------------------------------------------------------
  // 3. REALTIME SUBSCRIPTION FOR ACTIVE STAY'S SUBCOLLECTIONS (Agenda & Checklist)
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!user || !activeStayId) {
      if (!user) {
        setUserAgendaItems([]);
        setUserChecklistItems([]);
      }
      subcollectionsListenerActiveRef.current = false;
      return;
    }

    const agendaRef = collection(db, 'users', user.uid, 'stays', activeStayId, 'agendaItems');
    const checklistRef = collection(db, 'users', user.uid, 'stays', activeStayId, 'checklistItems');

    const unsubAgenda = onSnapshot(
      agendaRef,
      (snapshot) => {
        subcollectionsListenerActiveRef.current = true;
        hasPendingWritesRef.current = hasPendingWritesRef.current || snapshot.metadata.hasPendingWrites;

        const items: AgendaItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as AgendaItem));

        setUserAgendaItems((prev) => {
          const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
          const merged = [...otherStaysItems, ...items];
          return areAgendaListsEqual(prev, merged) ? prev : merged;
        });
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

        setUserChecklistItems((prev) => {
          const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
          const merged = [...otherStaysItems, ...items];
          return areChecklistListsEqual(prev, merged) ? prev : merged;
        });
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
  }, [user, activeStayId]);

  // Active stay data selectors
  const stays = useMemo(() => {
    return isPersonalMode ? userStays : SHOWCASE_STAYS;
  }, [isPersonalMode, userStays]);

  const activeStay = useMemo(() => {
    if (!stays || stays.length === 0) return null;
    const found = stays.find((s) => s.id === activeStayId);
    return found || stays[0] || null;
  }, [stays, activeStayId]);

  const activeAgendaItems = useMemo(() => {
    if (!activeStay) return [];
    if (isPersonalMode) {
      return userAgendaItems.filter((i) => i.stayId === activeStay.id);
    }
    return SHOWCASE_AGENDA_ITEMS.filter((i) => i.stayId === activeStay.id);
  }, [isPersonalMode, activeStay, userAgendaItems]);

  const activeChecklistItems = useMemo(() => {
    if (!activeStay) return [];
    if (isPersonalMode) {
      return userChecklistItems.filter((i) => i.stayId === activeStay.id);
    }
    return SHOWCASE_CHECKLIST_ITEMS.filter((i) => i.stayId === activeStay.id);
  }, [isPersonalMode, activeStay, userChecklistItems]);

  const setActiveStayId = (id: string) => {
    setActiveStayIdState(id);
    if (user) {
      try {
        localStorage.setItem(getUserActivePrefKey(user.uid), id);
      } catch {}
    }
  };

  // ----------------------------------------------------------------------------------
  // 4. AWAITED FIRESTORE WRITE MUTATIONS (Server-Authoritative)
  // ----------------------------------------------------------------------------------

  const addStay = useCallback(
    async (newStayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> => {
      if (!user) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk mencipta Stay.');
        return '';
      }

      const stayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const newStay: Stay = {
        ...newStayData,
        id: stayId,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      };

      const starterChecklist: ChecklistItem[] = [
        { id: `chk_${now}_1`, stayId, userId: user.uid, category: 'essentials', text: 'Pakaian & pakaian solat', isCompleted: false, createdAt: now, updatedAt: now },
        { id: `chk_${now}_2`, stayId, userId: user.uid, category: 'essentials', text: 'Pengecas telefon & ubatan harian', isCompleted: false, createdAt: now, updatedAt: now },
        { id: `chk_${now}_3`, stayId, userId: user.uid, category: 'food_gifts', text: 'Buah tangan / bekalan makanan', isCompleted: false, createdAt: now, updatedAt: now }
      ];

      const starterAgenda: AgendaItem = {
        id: `agn_${now}_1`,
        stayId,
        userId: user.uid,
        dayNumber: 1,
        timeSlot: 'afternoon',
        timeSpecific: '03:00 PM',
        title: 'Ketibaan & Daftar Masuk',
        description: 'Tiba di lokasi, susun barang dan rehat santai.',
        priority: 'must_do',
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic state update
      setUserStays((prev) => [newStay, ...prev]);
      setUserChecklistItems((prev) => [...prev, ...starterChecklist]);
      setUserAgendaItems((prev) => [...prev, starterAgenda]);
      setActiveStayIdState(stayId);

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const stayDocRef = doc(db, 'users', user.uid, 'stays', stayId);
        const batch = writeBatch(db);

        batch.set(stayDocRef, sanitizeForFirestore<Stay>(newStay));

        starterChecklist.forEach((item) => {
          const itemRef = doc(collection(db, 'users', user.uid, 'stays', stayId, 'checklistItems'), item.id);
          batch.set(itemRef, sanitizeForFirestore<ChecklistItem>(item));
        });

        const agendaRef = doc(collection(db, 'users', user.uid, 'stays', stayId, 'agendaItems'), starterAgenda.id);
        batch.set(agendaRef, sanitizeForFirestore<AgendaItem>(starterAgenda));

        await batch.commit();

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
    [user, requireAuth]
  );

  const updateStay = useCallback(
    async (id: string, updates: Partial<Stay>) => {
      if (!user) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk mengemas kini Stay.');
        return;
      }

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

        const stayRef = doc(db, 'users', user.uid, 'stays', id);
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
    [user, requireAuth]
  );

  const deleteStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk memadam Stay.');
        return;
      }

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

        const agendaSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'agendaItems'));
        const checklistSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'checklistItems'));

        const batch = writeBatch(db);
        agendaSnap.forEach((d) => batch.delete(d.ref));
        checklistSnap.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(db, 'users', user.uid, 'stays', id));

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
    [user, requireAuth]
  );

  const duplicateStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk menduplikasi Stay.');
        return;
      }

      const target = userStays.find((s) => s.id === id);
      if (!target) return;

      const newStayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const duplicatedStay: Stay = {
        ...target,
        id: newStayId,
        userId: user.uid,
        title: `${target.title} (Salinan)`,
        createdAt: now,
        updatedAt: now
      };

      const sourceAgendas = userAgendaItems.filter((a) => a.stayId === id);
      const dupAgendas: AgendaItem[] = sourceAgendas.map((a, i) => ({
        ...a,
        id: `agn_${now}_${i}`,
        stayId: newStayId,
        userId: user.uid,
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      }));

      const sourceChecklists = userChecklistItems.filter((c) => c.stayId === id);
      const dupChecklists: ChecklistItem[] = sourceChecklists.map((c, i) => ({
        ...c,
        id: `chk_${now}_${i}`,
        stayId: newStayId,
        userId: user.uid,
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
        const stayRef = doc(db, 'users', user.uid, 'stays', newStayId);
        batch.set(stayRef, sanitizeForFirestore<Stay>(duplicatedStay));

        dupAgendas.forEach((item) => {
          const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'agendaItems'), item.id);
          batch.set(itemRef, sanitizeForFirestore<AgendaItem>(item));
        });

        dupChecklists.forEach((item) => {
          const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'checklistItems'), item.id);
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
    [user, userStays, userAgendaItems, userChecklistItems, requireAuth]
  );

  const addAgendaItem = useCallback(
    async (item: Omit<AgendaItem, 'id' | 'userId'>): Promise<string> => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk menambah aktiviti.');
        return '';
      }

      const newItemId = `agn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const newItem: AgendaItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic update
      setUserAgendaItems((prev) => [...prev, newItem]);

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems');
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
    [user, activeStay, requireAuth]
  );

  const updateAgendaItem = useCallback(
    async (id: string, updates: Partial<AgendaItem>) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk mengemas kini aktiviti.');
        return;
      }

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

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
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
    [user, activeStay, requireAuth]
  );

  const batchUpdateAgendaItems = useCallback(
    async (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => {
      if (!user || !activeStay || updatesList.length === 0) return;

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
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', item.id);
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
    [user, activeStay]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk memadam aktiviti.');
        return;
      }

      // Optimistic removal
      setUserAgendaItems((prev) => prev.filter((a) => a.id !== id));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
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
    [user, activeStay, requireAuth]
  );

  const toggleAgendaComplete = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk menanda aktiviti siap.');
        return;
      }

      const existing = userAgendaItems.find((i) => i.id === id);
      if (!existing) return;
      const nextCompleted = !existing.isCompleted;
      const now = Date.now();

      // Optimistic update
      setUserAgendaItems((prev) => prev.map((a) => (a.id === id ? { ...a, isCompleted: nextCompleted, updatedAt: now } : a)));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
        await updateDoc(itemRef, { isCompleted: nextCompleted, updatedAt: now });

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
    [user, activeStay, userAgendaItems, requireAuth]
  );

  const addChecklistItem = useCallback(
    async (item: Omit<ChecklistItem, 'id' | 'userId'>): Promise<string> => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk menambah senarai semak.');
        return '';
      }

      const newItemId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const newItem: ChecklistItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic update
      setUserChecklistItems((prev) => [...prev, newItem]);

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems');
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
    [user, activeStay, requireAuth]
  );

  const toggleChecklistComplete = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk menanda senarai semak.');
        return;
      }

      const existing = userChecklistItems.find((i) => i.id === id);
      if (!existing) return;
      const nextCompleted = !existing.isCompleted;
      const now = Date.now();

      // Optimistic update
      setUserChecklistItems((prev) => prev.map((c) => (c.id === id ? { ...c, isCompleted: nextCompleted, updatedAt: now } : c)));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
        await updateDoc(itemRef, { isCompleted: nextCompleted, updatedAt: now });

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
    [user, activeStay, userChecklistItems, requireAuth]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk memadam senarai semak.');
        return;
      }

      // Optimistic removal
      setUserChecklistItems((prev) => prev.filter((c) => c.id !== id));

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
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
    [user, activeStay, requireAuth]
  );

  const createFromStarterTemplate = useCallback(
    async (templateType: StayType): Promise<string> => {
      if (!user) {
        requireAuth(() => {}, 'Sila buka kunci StayPlan untuk memilih templat.');
        return '';
      }

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
    [user, addStay, requireAuth]
  );

  const exportDataJson = useCallback((): string => {
    return JSON.stringify(
      {
        userUid: user?.uid || null,
        stays: isPersonalMode ? userStays : SHOWCASE_STAYS,
        agendaItems: isPersonalMode ? userAgendaItems : SHOWCASE_AGENDA_ITEMS,
        checklistItems: isPersonalMode ? userChecklistItems : SHOWCASE_CHECKLIST_ITEMS,
        activeStayId
      },
      null,
      2
    );
  }, [user, isPersonalMode, userStays, userAgendaItems, userChecklistItems, activeStayId]);

  return (
    <StayContext.Provider
      value={{
        stays,
        activeStay,
        activeStayId,
        setActiveStayId,
        agendaItems: isPersonalMode ? userAgendaItems : SHOWCASE_AGENDA_ITEMS,
        activeAgendaItems,
        checklistItems: isPersonalMode ? userChecklistItems : SHOWCASE_CHECKLIST_ITEMS,
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
        exportDataJson
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
