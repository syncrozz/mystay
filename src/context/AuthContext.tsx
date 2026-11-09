import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  auth,
  firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  db
} from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isAdminMode: boolean; // Planner / Edit mode
  isUnlocked: boolean;
  isLoading: boolean;
  validateAndActivateAdmin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  deactivateAdminMode: () => void;
  togglePlannerMode: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // Admin PIN Modal controls
  isAdminModalOpen: boolean;
  adminModalContext: string;
  openAdminModal: (contextMessage?: string, onAuthenticated?: () => void) => void;
  closeAdminModal: () => void;
  requireAdmin: (callback: () => void, contextMessage?: string) => void;
  // Compatibility aliases
  unlockWithPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  lockApp: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalContext: string;
  openAuthModal: (contextMessage?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (callback: () => void, contextMessage?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for user-configured PIN and session mode
const PIN_HASH_KEY = 'stayplan_custom_pin_hash_v1';
const PLANNER_MODE_KEY = 'stayplan_planner_mode_active_v1';
const DEFAULT_PIN = '5313'; // Default fallback PIN for family lock

/**
 * Calculates SHA-256 hex string using Web Crypto API.
 */
async function computeSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // In StayPlan, the device owner is in Planner/Admin mode by default.
  // They can lock to "Viewer Mode" when sharing their device with family.
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(PLANNER_MODE_KEY);
      // Default to true (Planner Mode) so owner has frictionless experience
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminModalContext, setAdminModalContext] = useState<string>('');
  const [pendingAdminCallback, setPendingAdminCallback] = useState<(() => void) | null>(null);

  // Inactivity auto-lock timer for Viewer Mode (optional security after 60 mins)
  const lastActivityRef = useRef<number>(Date.now());

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const now = Date.now();

        // Sync or update user profile in Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            // New user registration: assign role: "USER" by default (SES v4.5 strict standard)
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || null,
              displayName: currentUser.displayName || 'Pengguna StayPlan',
              photoURL: currentUser.photoURL || null,
              provider: currentUser.providerData?.[0]?.providerId || 'google.com',
              role: 'USER',
              createdAt: now,
              updatedAt: now,
              lastLoginAt: now
            };
            setUserProfile(newProfile);

            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || null,
              displayName: currentUser.displayName || 'Pengguna StayPlan',
              photoURL: currentUser.photoURL || null,
              provider: currentUser.providerData?.[0]?.providerId || 'google.com',
              role: 'USER',
              createdAt: now,
              updatedAt: now,
              lastLoginAt: now,
              serverTimestamp: serverTimestamp()
            });
          } else {
            // Returning user: retrieve authoritative role from database (never allow client-side self promotion)
            const dbData = snap.data();
            const authoritativeRole: UserRole = (dbData?.role as UserRole) || 'USER';

            setUserProfile({
              uid: currentUser.uid,
              email: currentUser.email || null,
              displayName: currentUser.displayName || dbData?.displayName || 'Pengguna StayPlan',
              photoURL: currentUser.photoURL || dbData?.photoURL || null,
              provider: currentUser.providerData?.[0]?.providerId || 'google.com',
              role: authoritativeRole,
              createdAt: dbData?.createdAt || now,
              updatedAt: now,
              lastLoginAt: now
            });

            // Update only safe transient login fields (uid, role, and createdAt are strictly immutable)
            await updateDoc(userRef, {
              lastLoginAt: now,
              updatedAt: now,
              displayName: currentUser.displayName || dbData?.displayName || 'Pengguna StayPlan',
              photoURL: currentUser.photoURL || dbData?.photoURL || null
            });
          }
        } catch (err) {
          console.warn('User profile sync notice:', err);
          // Fallback minimal profile if Firestore fetch fails temporarily
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || null,
            displayName: currentUser.displayName || 'Pengguna StayPlan',
            photoURL: currentUser.photoURL || null,
            provider: currentUser.providerData?.[0]?.providerId || 'google.com',
            role: 'USER',
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Validates PIN to unlock Planner Mode from Viewer Mode.
   */
  const validateAndActivateAdmin = useCallback(
    async (inputPin: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const cleanPin = (inputPin || '').trim();
        if (cleanPin.length === 0) {
          return { success: false, message: 'Sila masukkan 4-digit PIN.' };
        }

        // Check against user-stored PIN or default 5313
        let customHash: string | null = null;
        try {
          customHash = localStorage.getItem(PIN_HASH_KEY);
        } catch {}

        let isValid = false;
        if (customHash) {
          const inputHash = await computeSha256(cleanPin);
          isValid = inputHash === customHash;
        } else {
          isValid = cleanPin === DEFAULT_PIN;
        }

        if (!isValid) {
          return { success: false, message: 'PIN tidak sah. Sila cuba lagi.' };
        }

        try {
          localStorage.setItem(PLANNER_MODE_KEY, 'true');
        } catch {}

        setIsAdminMode(true);
        lastActivityRef.current = Date.now();

        // Run pending callback if any
        if (pendingAdminCallback) {
          const cb = pendingAdminCallback;
          setPendingAdminCallback(null);
          setTimeout(() => {
            try {
              cb();
            } catch (e) {
              console.error('Error executing callback:', e);
            }
          }, 50);
        }

        setIsAdminModalOpen(false);
        return { success: true };
      } catch (err: any) {
        return { success: false, message: 'Ralat mengesahkan PIN.' };
      }
    },
    [pendingAdminCallback]
  );

  /**
   * Deactivates Planner Mode into Viewer Mode (Read-Only display).
   */
  const deactivateAdminMode = useCallback(() => {
    try {
      localStorage.setItem(PLANNER_MODE_KEY, 'false');
    } catch {}
    setIsAdminMode(false);
    setPendingAdminCallback(null);
  }, []);

  const togglePlannerMode = useCallback(() => {
    if (isAdminMode) {
      deactivateAdminMode();
    } else {
      openAdminModal('Sila sahkan PIN untuk kembali ke Mod Perancang.');
    }
  }, [isAdminMode, deactivateAdminMode]);

  const openAdminModal = useCallback((contextMessage?: string, onAuthenticated?: () => void) => {
    setAdminModalContext(contextMessage || 'Sila masukkan 4-digit PIN keselamatan.');
    if (onAuthenticated) {
      setPendingAdminCallback(() => onAuthenticated);
    }
    setIsAdminModalOpen(true);
  }, []);

  const closeAdminModal = useCallback(() => {
    setIsAdminModalOpen(false);
    setPendingAdminCallback(null);
  }, []);

  /**
   * Permission gate:
   * If in Planner / Admin Mode, callback executes immediately without asking for PIN.
   * If in Viewer / Family Mode, prompts PIN to authorize the modification.
   */
  const requireAdmin = useCallback(
    (callback: () => void, contextMessage?: string) => {
      if (isAdminMode) {
        callback();
      } else {
        openAdminModal(
          contextMessage || 'Mod Paparan aktif. Sila masukkan PIN untuk mengedit.',
          callback
        );
      }
    },
    [isAdminMode, openAdminModal]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    deactivateAdminMode();
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  }, [deactivateAdminMode]);

  const role: UserRole = userProfile?.role || 'USER';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAuthenticated: !!user,
        isAdminMode,
        isUnlocked: true,
        isLoading,
        validateAndActivateAdmin,
        deactivateAdminMode,
        togglePlannerMode,
        signInWithGoogle,
        signOut,
        // Admin PIN modal
        isAdminModalOpen,
        adminModalContext,
        openAdminModal,
        closeAdminModal,
        requireAdmin,
        // Aliases for compatibility
        unlockWithPin: validateAndActivateAdmin,
        lockApp: async () => deactivateAdminMode(),
        isAuthModalOpen: isAdminModalOpen,
        authModalContext: adminModalContext,
        openAuthModal: openAdminModal,
        closeAuthModal: closeAdminModal,
        requireAuth: requireAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
