import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  firebaseSignOut,
  onAuthStateChanged,
  User,
  db
} from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isAdminMode: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  validateAndActivateAdmin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  deactivateAdminMode: () => void;
  unlockWithPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  lockApp: () => Promise<void>;
  signOut: () => Promise<void>;
  // Admin PIN Modal controls
  isAdminModalOpen: boolean;
  adminModalContext: string;
  openAdminModal: (contextMessage?: string, onAuthenticated?: () => void) => void;
  closeAdminModal: () => void;
  requireAdmin: (callback: () => void, contextMessage?: string) => void;
  // Compatibility aliases
  isAuthModalOpen: boolean;
  authModalContext: string;
  openAuthModal: (contextMessage?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (callback: () => void, contextMessage?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage keys (stores session state token only, never stores raw PIN)
const ADMIN_MODE_SESSION_KEY = 'stayplan_admin_mode_active';

// Expected SHA-256 digest for secret owner PIN
const ADMIN_PIN_HASH = '0d8be8cfcf9aa1b7fc945bda750efdc7e085026e0a3c50d90adbca1f451618e1';
const RAW_ADMIN_PIN = '5313';

// Internal owner credentials for Firebase Auth
const OWNER_AUTH_EMAIL = 'owner@stayplan.personal';
const OWNER_AUTH_SECRET = 'StayPlan_Personal_Owner_5313_SecureCloudKey!';

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
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_MODE_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminModalContext, setAdminModalContext] = useState<string>('');
  const [pendingAdminCallback, setPendingAdminCallback] = useState<(() => void) | null>(null);

  // Inactivity auto-deactivate timer for Admin Mode (45 minutes)
  const lastAdminActivityRef = useRef<number>(Date.now());

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserProfile({
          uid: currentUser.uid,
          email: currentUser.email || OWNER_AUTH_EMAIL,
          displayName: 'Pentadbir StayPlan',
          photoURL: null,
          role: 'ADMIN',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        // Background sync owner/admin profile document in Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || OWNER_AUTH_EMAIL,
              displayName: 'Pentadbir StayPlan',
              role: 'ADMIN',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdAtServer: serverTimestamp()
            });
          }
        } catch (err) {
          console.warn('Admin profile sync note:', err);
        }
      } else {
        // If not logged in, attempt seamless anonymous auth to enable Firestore realtime sync
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.warn('Initial session init note:', anonErr);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Inactivity timeout for Admin Mode
  useEffect(() => {
    if (!isAdminMode) return;

    const resetActivity = () => {
      lastAdminActivityRef.current = Date.now();
    };

    const interval = setInterval(() => {
      // 45 minutes of inactivity = auto deactivate Admin Mode
      if (Date.now() - lastAdminActivityRef.current > 45 * 60 * 1000) {
        deactivateAdminMode();
      }
    }, 60 * 1000);

    window.addEventListener('mousemove', resetActivity, { passive: true });
    window.addEventListener('keydown', resetActivity, { passive: true });
    window.addEventListener('touchstart', resetActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
    };
  }, [isAdminMode]);

  /**
   * Validates PIN and activates Admin Mode.
   */
  const validateAndActivateAdmin = useCallback(
    async (inputPin: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const cleanPin = (inputPin || '').trim();
        if (cleanPin.length === 0) {
          return { success: false, message: 'Sila masukkan 4-digit PIN.' };
        }

        const inputHash = await computeSha256(cleanPin);
        const isValid = cleanPin === RAW_ADMIN_PIN || inputHash === ADMIN_PIN_HASH;

        if (!isValid) {
          return { success: false, message: 'PIN salah. Sila cuba lagi.' };
        }

        // Establish full Firebase authentication credentials if not already signed in
        try {
          await signInWithEmailAndPassword(auth, OWNER_AUTH_EMAIL, OWNER_AUTH_SECRET);
        } catch (authErr: any) {
          if (
            authErr?.code === 'auth/user-not-found' ||
            authErr?.code === 'auth/invalid-credential' ||
            authErr?.code === 'auth/wrong-password'
          ) {
            try {
              await createUserWithEmailAndPassword(auth, OWNER_AUTH_EMAIL, OWNER_AUTH_SECRET);
            } catch (createErr: any) {
              if (
                createErr?.code === 'auth/operation-not-allowed' ||
                createErr?.code === 'auth/email-already-in-use'
              ) {
                try {
                  await signInAnonymously(auth);
                } catch {}
              }
            }
          } else if (authErr?.code === 'auth/operation-not-allowed') {
            try {
              await signInAnonymously(auth);
            } catch {}
          }
        }

        // Save active state to session storage
        try {
          sessionStorage.setItem(ADMIN_MODE_SESSION_KEY, 'true');
        } catch {}

        setIsAdminMode(true);
        lastAdminActivityRef.current = Date.now();

        // Run pending admin callback if any
        if (pendingAdminCallback) {
          const cb = pendingAdminCallback;
          setPendingAdminCallback(null);
          // Execute callback shortly after modal unmounts
          setTimeout(() => {
            try {
              cb();
            } catch (e) {
              console.error('Error executing admin action:', e);
            }
          }, 50);
        }

        setIsAdminModalOpen(false);
        return { success: true };
      } catch (err: any) {
        return { success: false, message: 'PIN salah. Sila cuba lagi.' };
      }
    },
    [pendingAdminCallback]
  );

  /**
   * Deactivates Admin Mode (switches to Read/Member view).
   */
  const deactivateAdminMode = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_MODE_SESSION_KEY);
    } catch {}
    setIsAdminMode(false);
    setPendingAdminCallback(null);
  }, []);

  /**
   * Opens the Admin PIN modal.
   */
  const openAdminModal = useCallback((contextMessage?: string, onAuthenticated?: () => void) => {
    setAdminModalContext(contextMessage || 'Sila masukkan 4-digit PIN keselamatan.');
    if (onAuthenticated) {
      setPendingAdminCallback(() => onAuthenticated);
    }
    setIsAdminModalOpen(true);
  }, []);

  /**
   * Closes the Admin PIN modal without activating.
   */
  const closeAdminModal = useCallback(() => {
    setIsAdminModalOpen(false);
    setPendingAdminCallback(null);
  }, []);

  /**
   * Gate for administrative actions: if in admin mode, runs callback directly;
   * otherwise, prompts the Admin PIN modal and runs callback upon success.
   */
  const requireAdmin = useCallback(
    (callback: () => void, contextMessage?: string) => {
      if (isAdminMode) {
        callback();
      } else {
        openAdminModal(contextMessage || 'Sila sahkan PIN Admin untuk meneruskan tindakan ini.', callback);
      }
    },
    [isAdminMode, openAdminModal]
  );

  const signOut = useCallback(async () => {
    deactivateAdminMode();
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign Out Error:', error);
    } finally {
      setUser(null);
      setUserProfile(null);
    }
  }, [deactivateAdminMode]);

  const role: UserRole = isAdminMode ? 'ADMIN' : 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAuthenticated: !!user,
        isAdminMode,
        isUnlocked: true, // App is open to view by all members; Admin Mode gates administrative actions
        isLoading,
        validateAndActivateAdmin,
        deactivateAdminMode,
        unlockWithPin: validateAndActivateAdmin,
        lockApp: async () => deactivateAdminMode(),
        signOut,
        // Admin PIN modal
        isAdminModalOpen,
        adminModalContext,
        openAdminModal,
        closeAdminModal,
        requireAdmin,
        // Aliases for compatibility
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
