
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  Firestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './config';

let appInstance: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;
let authInstance: Auth | undefined;

export function initializeFirebase(): {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
} {
  if (!isFirebaseConfigured) {
    console.warn('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* variables to enable persistence.');
    return { app: null, db: null, auth: null };
  }

  // Ensure we only initialize once
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (!dbInstance) {
    try {
      // Attempt to initialize with specific persistence settings
      dbInstance = initializeFirestore(appInstance, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
          cacheSizeBytes: 40 * 1024 * 1024 // 40 MB limit for "Edge Survival"
        })
      });
    } catch (e) {
      // If already initialized (e.g. during HMR), get the existing instance
      dbInstance = getFirestore(appInstance);
    }
  }

  if (!authInstance) {
    authInstance = getAuth(appInstance);
  }

  return { 
    app: appInstance, 
    db: dbInstance, 
    auth: authInstance 
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
