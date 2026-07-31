import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore (handling custom databaseId if configured)
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;
export const db = (firestoreDatabaseId && firestoreDatabaseId !== "(default)")
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);

export default app;
