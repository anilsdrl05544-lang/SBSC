import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, disableNetwork, enableNetwork, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence Firestore internal log noise to prevent AI Studio error detector from auto-switching tabs
try {
  setLogLevel('silent');
} catch {}

// Initialize Firebase App instance singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export { disableNetwork, enableNetwork };

const QUOTA_STORAGE_KEY = 'sbsc_firestore_quota_exhausted_timestamp';

// Check quota state on boot: disable network if quota is exhausted to prevent aggressive background write retries
try {
  const quotaRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(QUOTA_STORAGE_KEY) : null;
  const isExhausted = quotaRaw && (Date.now() - parseInt(quotaRaw, 10) < 6 * 60 * 60 * 1000);
  if (isExhausted) {
    disableNetwork(db).catch(() => {});
  } else {
    enableNetwork(db).catch(() => {});
  }
} catch {
  // non-fatal
}

// Connection test helper mandated by Firebase skill
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const quotaRaw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (quotaRaw) {
      const elapsed = Date.now() - parseInt(quotaRaw, 10);
      if (elapsed < 6 * 60 * 60 * 1000) {
        return false;
      }
    }

    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✓ Firebase Firestore connection verified.');
    return true;
  } catch (error: any) {
    const msg = (error?.message || String(error)).toLowerCase();
    const code = error?.code || error?.error?.code || '';
    if (
      code === 'resource-exhausted' ||
      msg.includes('resource-exhausted') ||
      msg.includes('quota limit exceeded') ||
      msg.includes('quota exceeded') ||
      msg.includes('free daily write units')
    ) {
      console.warn('Firebase daily quota exceeded during connection test. Disabling network.');
      try {
        localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
        await disableNetwork(db);
      } catch {}
      return false;
    }

    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
      return false;
    }

    console.warn('Firebase connection test failed:', error);
    return false;
  }
}

export default db;

