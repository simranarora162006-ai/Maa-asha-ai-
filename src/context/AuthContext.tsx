import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile, UserRole, UserStatus } from '../types';
import { registerMotherFromProfile, generateUniqueAshaId } from '../lib/beneficiaryStorage';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  duplicateSyncNotice: string | null;
  clearDuplicateSyncNotice: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithAshaIdOrEmail: (identifier: string, pass: string) => Promise<void>;
  signUpUser: (data: Partial<UserProfile> & { password?: string; instantApprove?: boolean }) => Promise<{ isDuplicate?: boolean; ashaWorkerId?: string }>;
  loginWithGoogle: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: (role: UserRole, status?: UserStatus) => void;
  approveAshaWorker: (uid: string) => Promise<void>;
  fetchPendingWorkers: () => Promise<UserProfile[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local Storage Keys for Persistent Sessions & Registered Accounts
const MAA_ASHA_SESSION_KEY = 'maa_asha_user_session';
const MAA_ASHA_USERS_KEY = 'maa_asha_registered_users';

const getStoredSession = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(MAA_ASHA_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored session:', e);
  }
  return null;
};

const setStoredSession = (profile: UserProfile | null) => {
  try {
    if (profile) {
      localStorage.setItem(MAA_ASHA_SESSION_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(MAA_ASHA_SESSION_KEY);
    }
  } catch (e) {
    console.warn('Error setting stored session:', e);
  }
};

const getLocalUsers = (): Record<string, { email: string; pass: string; profile: UserProfile }> => {
  try {
    const raw = localStorage.getItem(MAA_ASHA_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error parsing local users:', e);
  }
  // Default seed users for quick test/demo
  const seed: Record<string, { email: string; pass: string; profile: UserProfile }> = {
    'sita.devi@maaasha.in': {
      email: 'sita.devi@maaasha.in',
      pass: 'password123',
      profile: {
        uid: 'demo-mother-1',
        email: 'sita.devi@maaasha.in',
        displayName: 'Sita Devi (सीता देवी)',
        role: 'pregnant_woman',
        status: 'approved',
        phone: '9876543210',
        village: 'Rampur Gram (रामपुर)',
        district: 'Sehore',
        dueDate: '2026-10-15',
        trimester: 2,
        createdAt: new Date().toISOString()
      }
    },
    'anjali.sharma@maaasha.in': {
      email: 'anjali.sharma@maaasha.in',
      pass: 'password123',
      profile: {
        uid: 'demo-asha-1',
        email: 'anjali.sharma@maaasha.in',
        displayName: 'Anjali Sharma (अंजलि शर्मा)',
        role: 'asha_worker',
        status: 'approved',
        phone: '9123456789',
        village: 'Rampur Sub-Center',
        district: 'Sehore',
        ashaWorkerId: 'ASHA-GOVT-101',
        subCenter: 'PHC Rampur',
        createdAt: new Date().toISOString()
      }
    },
    'asha-govt-101@health.gov.in': {
      email: 'asha-govt-101@health.gov.in',
      pass: '2026',
      profile: {
        uid: 'demo-asha-govt-101',
        email: 'asha-govt-101@health.gov.in',
        displayName: 'ASHA Worker (Govt-101)',
        role: 'asha_worker',
        status: 'approved',
        phone: '9123456789',
        village: 'Rampur Sub-Center',
        district: 'Sehore',
        ashaWorkerId: 'ASHA-GOVT-101',
        subCenter: 'PHC Rampur',
        createdAt: new Date().toISOString()
      }
    },
    'admin@maaasha.in': {
      email: 'admin@maaasha.in',
      pass: 'admin123',
      profile: {
        uid: 'demo-admin-1',
        email: 'admin@maaasha.in',
        displayName: 'Dr. Rajesh Kumar (Health Supervisor)',
        role: 'admin',
        status: 'approved',
        phone: '9988776655',
        village: 'District HQ',
        district: 'Sehore',
        createdAt: new Date().toISOString()
      }
    }
  };
  try {
    localStorage.setItem(MAA_ASHA_USERS_KEY, JSON.stringify(seed));
  } catch (e) {}
  return seed;
};

const saveLocalUser = (email: string, pass: string, profile: UserProfile) => {
  const users = getLocalUsers();
  users[email.toLowerCase()] = { email: email.toLowerCase(), pass, profile };
  try {
    localStorage.setItem(MAA_ASHA_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Error saving local user:', e);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(() => getStoredSession());
  const [loading, setLoading] = useState<boolean>(true);
  const [duplicateSyncNotice, setDuplicateSyncNotice] = useState<string | null>(null);

  const clearDuplicateSyncNotice = () => setDuplicateSyncNotice(null);

  const setUserProfile = (profile: UserProfile | null) => {
    setUserProfileState(profile);
    setStoredSession(profile);
  };

  // Sync Firebase Auth user profile
  useEffect(() => {
    let isSubscribed = true;

    // Safety timeout fallback to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (isSubscribed) {
        setLoading(false);
      }
    }, 1000);

    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (!isSubscribed) return;
      setFirebaseUser(currUser);
      if (currUser) {
        try {
          const userDocRef = doc(db, 'users', currUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists() && isSubscribed) {
            const fetchedProfile = docSnap.data() as UserProfile;
            setUserProfile(fetchedProfile);
          } else if (isSubscribed) {
            // Default profile if newly logged in
            const newProfile: UserProfile = {
              uid: currUser.uid,
              email: currUser.email || '',
              displayName: currUser.displayName || currUser.email?.split('@')[0] || 'User',
              role: 'pregnant_woman',
              status: 'approved',
              createdAt: new Date().toISOString()
            };
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.warn('Error reading user profile from Firestore:', err);
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
      clearTimeout(timeoutId);
    });

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setLoading(false);
      throw { code: 'auth/invalid-email', message: 'Please enter a valid email address.' };
    }
    if (!pass) {
      setLoading(false);
      throw { code: 'auth/wrong-password', message: 'Password is required.' };
    }

    let firebaseAuthFailed = false;
    let firebaseAuthError: any = null;

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const userDocRef = doc(db, 'users', cred.user.uid);
      const docSnap = await getDoc(userDocRef);
      let profile: UserProfile;
      if (docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      } else {
        profile = {
          uid: cred.user.uid,
          email: cleanEmail,
          displayName: cleanEmail.split('@')[0],
          role: 'pregnant_woman',
          status: 'approved',
          createdAt: new Date().toISOString()
        };
      }
      setUserProfile(profile);
      saveLocalUser(cleanEmail, pass, profile);
      setLoading(false);
      return;
    } catch (err: any) {
      firebaseAuthFailed = true;
      firebaseAuthError = err;
      console.warn('Firebase login notice:', err?.code, err?.message);
    }

    // Check local storage accounts for matching credentials
    const localUsers = getLocalUsers();
    const existingAccount = localUsers[cleanEmail];

    if (existingAccount) {
      if (existingAccount.pass === pass) {
        setUserProfile(existingAccount.profile);
        setLoading(false);
        return;
      } else {
        setLoading(false);
        throw {
          code: 'auth/wrong-password',
          message: 'Invalid email or password.'
        };
      }
    }

    // If Firebase returned explicit auth error or user not found locally:
    if (firebaseAuthError && (firebaseAuthError.code === 'auth/wrong-password' || firebaseAuthError.code === 'auth/invalid-credential')) {
      setLoading(false);
      throw {
        code: 'auth/wrong-password',
        message: 'Invalid email or password.'
      };
    }

    setLoading(false);
    throw {
      code: 'auth/user-not-found',
      message: 'Invalid email or password. Account not found.'
    };
  };

  const loginWithAshaIdOrEmail = async (identifier: string, pass: string) => {
    setLoading(true);
    const cleanId = identifier.trim();
    if (!cleanId) {
      setLoading(false);
      throw { code: 'auth/invalid-email', message: 'Please enter ASHA Worker ID, Phone, or Email.' };
    }

    const cleanPin = pass.trim();

    // 1. Check local storage registered accounts for matching ASHA ID, Phone, Email, or UID
    const localUsers = getLocalUsers();
    let matchedAccount: { email: string; pass: string; profile: UserProfile } | null = null;

    for (const key in localUsers) {
      const user = localUsers[key];
      const p = user.profile;
      const cleanPhone = (p.phone || '').replace(/\D/g, '');
      const inputCleanPhone = cleanId.replace(/\D/g, '');

      if (
        (p.ashaWorkerId && p.ashaWorkerId.toUpperCase() === cleanId.toUpperCase()) ||
        (cleanPhone && inputCleanPhone && cleanPhone === inputCleanPhone && inputCleanPhone.length === 10) ||
        (p.email && p.email.toLowerCase() === cleanId.toLowerCase()) ||
        (p.uid && p.uid === cleanId)
      ) {
        matchedAccount = user;
        break;
      }
    }

    if (matchedAccount) {
      if (
        matchedAccount.pass === cleanPin ||
        matchedAccount.pass === cleanPin.padEnd(6, '0') ||
        matchedAccount.pass.startsWith(cleanPin)
      ) {
        setUserProfile(matchedAccount.profile);
        setLoading(false);
        return;
      } else {
        setLoading(false);
        throw { code: 'auth/wrong-password', message: 'Invalid Secret Access PIN or Password.' };
      }
    }

    // 2. If cleanId is an email, attempt standard email login
    if (cleanId.includes('@')) {
      try {
        await loginWithEmail(cleanId, cleanPin);
        return;
      } catch (err: any) {
        if (err?.code === 'auth/wrong-password') {
          setLoading(false);
          throw err;
        }
      }
    }

    // 3. Search Firestore users collection by ashaWorkerId, phone, or email
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef, where('ashaWorkerId', '==', cleanId.toUpperCase()));
      let querySnap = await getDocs(q);

      if (querySnap.empty && cleanId.replace(/\D/g, '').length === 10) {
        q = query(usersRef, where('phone', '==', cleanId.replace(/\D/g, '')));
        querySnap = await getDocs(q);
      }

      if (!querySnap.empty) {
        const userDoc = querySnap.docs[0];
        const profile = userDoc.data() as UserProfile;
        setUserProfile(profile);
        saveLocalUser(profile.email || `${profile.uid}@maaasha.in`, cleanPin, profile);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Firestore ASHA ID lookup notice:', err);
    }

    // 4. Seed fallback for demo asha worker (e.g. ASHA-GOVT-101)
    if (cleanId.toUpperCase() === 'ASHA-GOVT-101' || cleanId.toLowerCase() === 'asha-govt-101@health.gov.in') {
      try {
        await loginWithEmail('asha-govt-101@health.gov.in', cleanPin);
        return;
      } catch (e) {}
    }

    setLoading(false);
    throw {
      code: 'auth/user-not-found',
      message: 'ASHA Account not found. Please verify your ASHA Worker ID or register.'
    };
  };

  const signUpUser = async (data: Partial<UserProfile> & { password?: string; instantApprove?: boolean }) => {
    setLoading(true);
    try {
      const cleanEmail = (data.email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw { code: 'auth/invalid-email', message: 'Please enter a valid email address.' };
      }

      // Password normalization: if a 4-digit PIN is provided, pad to 6 chars for Firebase Auth requirement
      let rawPass = data.password || '123456';
      if (rawPass.length < 6) {
        rawPass = rawPass.padEnd(6, '0');
      }

      // Check local storage registered users for duplicate email
      const localUsers = getLocalUsers();
      if (localUsers[cleanEmail]) {
        throw {
          code: 'auth/email-already-in-use',
          message: 'Email already registered. Please login with your existing password.'
        };
      }

      // Check Firestore users collection to prevent duplicate email registration
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', cleanEmail));
        const existingDocs = await getDocs(q);
        if (!existingDocs.empty) {
          throw {
            code: 'auth/email-already-in-use',
            message: 'Email already registered. Please login with your existing password.'
          };
        }
      } catch (checkErr: any) {
        if (checkErr?.code === 'auth/email-already-in-use') {
          throw checkErr;
        }
      }

      const role: UserRole = data.role || 'pregnant_woman';
      const status: UserStatus = (role === 'asha_worker' && !data.instantApprove) ? 'pending_approval' : 'approved';

      // Auto Generate Unique ASHA ID for ASHA Workers
      const ashaWorkerId = role === 'asha_worker' 
        ? (data.ashaWorkerId || generateUniqueAshaId(data.village))
        : (data.ashaWorkerId || '');

      let uid = '';
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, rawPass);
        uid = cred.user.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          throw {
            code: 'auth/email-already-in-use',
            message: 'Email already registered. Please login with your existing password.'
          };
        } else {
          console.warn('Firebase Auth fallback notice:', authErr.message);
          uid = 'local-' + Date.now();
        }
      }

      // Compute EDD as LMP + 280 days if lmpDate is provided
      let computedDueDate = data.dueDate;
      if (data.lmpDate && !computedDueDate) {
        const lmpTime = new Date(data.lmpDate).getTime();
        if (!isNaN(lmpTime)) {
          computedDueDate = new Date(lmpTime + 280 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
      }
      if (!computedDueDate) {
        computedDueDate = new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0];
      }

      const newProfile: UserProfile = {
        uid,
        email: cleanEmail,
        displayName: data.displayName || cleanEmail.split('@')[0],
        role: role,
        status: status,
        phone: data.phone || '',
        village: data.village || 'Rampur Gram',
        district: data.district || 'Sehore',
        lmpDate: data.lmpDate || '',
        dueDate: computedDueDate,
        trimester: data.trimester || 2,
        ashaWorkerId: ashaWorkerId,
        subCenter: data.subCenter || `Primary Health Center ${data.village || 'Rampur'}`,
        createdAt: new Date().toISOString()
      };

      // Save to Firestore users collection
      try {
        await setDoc(doc(db, 'users', uid), newProfile);
      } catch (fErr) {
        console.warn('Firestore user profile write notice:', fErr);
      }

      // Save to local storage users registry
      saveLocalUser(cleanEmail, rawPass, newProfile);

      let isDuplicate = false;
      // Automatically register mother profile into central beneficiary list
      if (role === 'pregnant_woman') {
        const regResult = registerMotherFromProfile(newProfile);
        isDuplicate = regResult.isDuplicate;
        if (isDuplicate) {
          setDuplicateSyncNotice('User already registered! Syncing with local ASHA worker.');
        }
      }

      setUserProfile(newProfile);
      setLoading(false);
      return { isDuplicate, ashaWorkerId };
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const loginWithGoogle = async (role: UserRole) => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      } else {
        const status: UserStatus = role === 'asha_worker' ? 'pending_approval' : 'approved';
        const profile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'Google User',
          role: role,
          status: status,
          village: 'Sundarnagar',
          district: 'Bhopal',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, profile);
        setUserProfile(profile);
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Signout warning:', e);
    }
    setFirebaseUser(null);
    setUserProfile(null);
  };

  // Demo Login helper to allow effortless live testing
  const demoLogin = (role: UserRole, status: UserStatus = 'approved') => {
    setLoading(true);
    const demoProfiles: Record<string, UserProfile> = {
      pregnant_woman: {
        uid: 'demo-mother-1',
        email: 'sita.devi@maaasha.in',
        displayName: 'Sita Devi (सीता देवी)',
        role: 'pregnant_woman',
        status: 'approved',
        phone: '9876543210',
        village: 'Rampur Gram (रामपुर)',
        district: 'Sehore',
        dueDate: '2026-10-15',
        trimester: 2,
        createdAt: new Date().toISOString()
      },
      asha_worker: {
        uid: status === 'pending_approval' ? 'demo-asha-pending' : 'demo-asha-1',
        email: status === 'pending_approval' ? 'sunita.verma@maaasha.in' : 'anjali.sharma@maaasha.in',
        displayName: status === 'pending_approval' ? 'Sunita Verma (सुनीता वर्मा)' : 'Anjali Sharma (अंजलि शर्मा)',
        role: 'asha_worker',
        status: status,
        phone: '9123456789',
        village: 'Rampur Sub-Center',
        district: 'Sehore',
        ashaWorkerId: 'ASHA-MP-1042',
        subCenter: 'PHC Rampur',
        createdAt: new Date().toISOString()
      },
      admin: {
        uid: 'demo-admin-1',
        email: 'admin@maaasha.in',
        displayName: 'Dr. Rajesh Kumar (Health Supervisor)',
        role: 'admin',
        status: 'approved',
        phone: '9988776655',
        village: 'District HQ',
        district: 'Sehore',
        createdAt: new Date().toISOString()
      }
    };

    const targetProfile = demoProfiles[role] || demoProfiles.pregnant_woman;
    if (role === 'asha_worker' && status === 'pending_approval') {
      targetProfile.status = 'pending_approval';
    }
    if (role === 'pregnant_woman') {
      registerMotherFromProfile(targetProfile);
    }
    setUserProfile(targetProfile);
    setLoading(false);
  };

  // Admin / Supervisor capability to approve pending ASHA workers
  const approveAshaWorker = async (uid: string) => {
    // 1. Immediately update React state if user is logged in
    if (userProfile && (userProfile.uid === uid || !uid)) {
      const approvedProfile: UserProfile = { ...userProfile, status: 'approved' };
      setUserProfile(approvedProfile);
    }

    // 2. Persist in local storage registered users
    try {
      const users = getLocalUsers();
      for (const emailKey in users) {
        if (users[emailKey].profile.uid === uid || (userProfile && users[emailKey].profile.email === userProfile.email)) {
          users[emailKey].profile.status = 'approved';
        }
      }
      localStorage.setItem(MAA_ASHA_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Error saving local user approval:', e);
    }

    // 3. Persist in Firestore if real cloud UID
    if (uid && !uid.startsWith('local-') && !uid.startsWith('demo-')) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { status: 'approved' });
      } catch (err) {
        console.warn('Error updating Firestore worker status:', err);
      }
    }
  };

  const fetchPendingWorkers = async (): Promise<UserProfile[]> => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'asha_worker'),
        where('status', '==', 'pending_approval')
      );
      const snapshot = await getDocs(q);
      const results: UserProfile[] = [];
      snapshot.forEach((doc) => {
        results.push(doc.data() as UserProfile);
      });
      return results;
    } catch (err) {
      console.warn('Error fetching pending workers:', err);
      // Return sample demo pending worker
      return [
        {
          uid: 'demo-asha-pending-sample',
          email: 'sunita.verma@maaasha.in',
          displayName: 'Sunita Verma (सुनीता वर्मा)',
          role: 'asha_worker',
          status: 'pending_approval',
          phone: '9811223344',
          village: 'Kalyanpur',
          district: 'Sehore',
          ashaWorkerId: 'ASHA-MP-2098',
          createdAt: new Date().toISOString()
        }
      ];
    }
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userProfile,
      loading,
      duplicateSyncNotice,
      clearDuplicateSyncNotice,
      loginWithEmail,
      loginWithAshaIdOrEmail,
      signUpUser,
      loginWithGoogle,
      logout,
      demoLogin,
      approveAshaWorker,
      fetchPendingWorkers
    }}>
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
