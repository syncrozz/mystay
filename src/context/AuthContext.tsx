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
  isUnlocked: boolean;
  isLoading: boolean;
  unlockWithPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
  lockApp: () => Promise<void>;
  signOut: () => Promise<void>;
  // Auth prompt modal management
  isAuthModalOpen: boolean;
  authModalContext: string;
  openAuthModal: (contextMessage?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (callback: () => void, contextMessage?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage key (never stores raw PIN, only an ephemeral session state token)
const SESSION_FLAG_KEY = 'stayplan_personal_session_unlocked';

// Expected SHA-256 digest for owner PIN (5313)
const OWNER_PIN_HASH = '0d8be8cfcf9aa1b7fc945bda750efdc7e085026e0a3c50d90adbca1f451618e1';

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
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_FLAG_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalContext, setAuthModalContext] = useState<string>('');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Inactivity auto-lock timer (30 minutes)
  const lastActivityRef = useRef<number>(Date.now());

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserProfile({
          uid: currentUser.uid,
          email: currentUser.email || OWNER_AUTH_EMAIL,
          displayName: 'Pemilik StayPlan',
          photoURL: null,
          role: 'ADMIN',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        // Background sync owner profile document in Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || OWNER_AUTH_EMAIL,
              displayName: 'Pemilik StayPlan',
              role: 'ADMIN',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdAtServer: serverTimestamp()
            });
          }
        } catch (err) {
          // Non-blocking background sync note
          console.warn('Owner profile sync status:', err);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Inactivity lock handler
  useEffect(() => {
    if (!isUnlocked) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const interval = setInterval(() => {
      // 30 minutes of inactivity = auto-lock
      if (Date.now() - lastActivityRef.current > 30 * 60 * 1000) {
        lockApp();
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
  }, [isUnlocked]);

  /**
   * Validates PIN securely and establishes the owner's Firebase session.
   */
  const unlockWithPin = useCallback(async (pin: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!pin || pin.trim().length === 0) {
        return { success: false, message: 'Sila masukkan PIN akses.' };
      }

      const inputHash = await computeSha256(pin.trim());
      if (inputHash !== OWNER_PIN_HASH) {
        return { success: false, message: 'PIN akses tidak sah. Sila semak semula.' };
      }

      // Establish Firebase authentication for the owner
      try {
        await signInWithEmailAndPassword(auth, OWNER_AUTH_EMAIL, OWNER_AUTH_SECRET);
      } catch (authErr: any) {
        if (
          authErr?.code === 'auth/user-not-found' ||
          authErr?.code === 'auth/invalid-credential' ||
          authErr?.code === 'auth/wrong-password'
        ) {
          // Attempt account creation on first launch
          try {
            await createUserWithEmailAndPassword(auth, OWNER_AUTH_EMAIL, OWNER_AUTH_SECRET);
          } catch (createErr: any) {
            // If email/password provider is not enabled on this Firebase instance, fallback to anonymous auth
            if (createErr?.code === 'auth/operation-not-allowed' || createErr?.code === 'auth/email-already-in-use') {
              try {
                await signInAnonymously(auth);
              } catch (anonErr) {
                console.warn('Auth fallback note:', anonErr);
              }
            } else {
              throw createErr;
            }
          }
        } else if (authErr?.code === 'auth/operation-not-allowed') {
          // Fallback to anonymous auth if Email provider is disabled
          try {
            await signInAnonymously(auth);
          } catch (anonErr) {
            console.warn('Anonymous auth note:', anonErr);
          }
        } else {
          // If offline or other recoverable state, proceed with session unlock
          console.warn('Firebase auth connection notice:', authErr);
        }
      }

      // Mark session as unlocked (in sessionStorage only, NEVER raw PIN)
      try {
        sessionStorage.setItem(SESSION_FLAG_KEY, 'true');
      } catch {}

      setIsUnlocked(true);
      lastActivityRef.current = Date.now();

      if (pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
      }
      setIsAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      console.error('Unlock error:', err);
      return { success: false, message: err?.message || 'Ralat mengesahkan PIN akses.' };
    }
  }, [pendingCallback]);

  /**
   * Locks the app and returns to the Private Access Screen.
   */
  const lockApp = useCallback(async () => {
    try {
      sessionStorage.removeItem(SESSION_FLAG_KEY);
    } catch {}
    setIsUnlocked(false);
  }, []);

  /**
   * Fully signs out of Firebase and locks the app.
   */
  const signOut = useCallback(async () => {
    try {
      sessionStorage.removeItem(SESSION_FLAG_KEY);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign Out Error:', error);
    } finally {
      setIsUnlocked(false);
      setUser(null);
      setUserProfile(null);
    }
  }, []);

  const openAuthModal = (contextMessage?: string) => {
    setAuthModalContext(contextMessage || 'Sila masukkan PIN untuk mengesahkan akses.');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPendingCallback(null);
  };

  const requireAuth = (callback: () => void, contextMessage?: string) => {
    if (isUnlocked && user) {
      callback();
    } else {
      setPendingCallback(() => callback);
      openAuthModal(contextMessage);
    }
  };

  const role: UserRole = userProfile?.role || 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAuthenticated: !!user && isUnlocked,
        isUnlocked,
        isLoading,
        unlockWithPin,
        lockApp,
        signOut,
        isAuthModalOpen,
        authModalContext,
        openAuthModal,
        closeAuthModal,
        requireAuth
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
