/**
 * Automated Institutional Data Backup Service for SBSC Public School ERP
 * Manages automated snapshot generation, scheduled checkpoints, IndexedDB persistence,
 * cloud backup synchronization, and snapshot restoration.
 *
 * NOTE: Uses IndexedDB to store full snapshot payloads to prevent browser localStorage quota exceeded errors.
 * Metadata is kept in memory and lightweight storage (< 2KB).
 */

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  lastBackupTime?: string;
  maxSnapshots: number;
  autoCloudSync: boolean;
}

export interface AutoBackupSnapshotSummary {
  totalStudents: number;
  activeStudents: number;
  totalFeePayments: number;
  totalFeeRevenue: number;
  totalTeachers: number;
  totalClasses: number;
  // Aliases for compatibility
  studentsCount?: number;
  feePaymentsCount?: number;
  teachersCount?: number;
}

export interface AutoBackupSnapshot {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // e.g. "13 Sep 2026, 10:45 AM"
  reason: 'scheduled_interval' | 'manual_trigger' | 'data_mutation';
  triggerReason?: string; // alias for reason
  summary: AutoBackupSnapshotSummary;
  sizeKb: number;
  payload: any; // Full school dataset
}

const CONFIG_STORAGE_KEY = 'sbsc_auto_backup_config_v2';
const SNAPSHOTS_STORAGE_KEY = 'sbsc_auto_backup_snapshots_v2'; // Legacy key that overflowed localStorage
const METADATA_STORAGE_KEY = 'sbsc_auto_backup_metadata_v2'; // Lightweight metadata only (< 2KB)
const DB_NAME = 'sbsc_school_backups_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  frequency: 'daily',
  maxSnapshots: 10,
  autoCloudSync: true,
};

// In-memory cache for fast synchronous UI access
let cachedSnapshots: AutoBackupSnapshot[] = [];
let isServiceInitialized = false;

// ============================================================================
// INDEXEDDB BACKEND HELPERS (Large Payload Storage with virtually no quota limit)
// ============================================================================

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openBackupDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSnapshotsFromDb(): Promise<AutoBackupSnapshot[]> {
  try {
    const db = await openBackupDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: AutoBackupSnapshot[] = req.result || [];
        resolve(
          results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Could not read snapshots from IndexedDB:', err);
    return [];
  }
}

export async function saveSnapshotToDb(snapshot: AutoBackupSnapshot, maxSnapshots: number): Promise<void> {
  try {
    const db = await openBackupDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(snapshot);

    // Prune older snapshots if exceeding max limit
    const allReq = store.getAll();
    allReq.onsuccess = () => {
      const list: AutoBackupSnapshot[] = allReq.result || [];
      if (list.length > maxSnapshots) {
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const toDelete = list.slice(maxSnapshots);
        const delTx = db.transaction(STORE_NAME, 'readwrite');
        const delStore = delTx.objectStore(STORE_NAME);
        toDelete.forEach((s) => delStore.delete(s.id));
      }
    };
  } catch (err) {
    console.warn('Could not save snapshot to IndexedDB:', err);
  }
}

export async function deleteSnapshotFromDb(id: string): Promise<void> {
  try {
    const db = await openBackupDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn('Could not delete snapshot from IndexedDB:', err);
  }
}

export async function clearSnapshotsFromDb(): Promise<void> {
  try {
    const db = await openBackupDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.warn('Could not clear snapshots from IndexedDB:', err);
  }
}

// ============================================================================
// LOCAL STORAGE METADATA & RECOVERY HELPERS
// ============================================================================

function saveMetadataToLocalStorage(snapshots: AutoBackupSnapshot[]) {
  try {
    // Only save metadata fields without the multi-megabyte payloads
    const metaList = snapshots.map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      formattedDate: s.formattedDate,
      reason: s.reason,
      triggerReason: s.triggerReason || s.reason,
      summary: s.summary,
      sizeKb: s.sizeKb,
    }));
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(metaList));
    // CRITICAL: Ensure legacy heavy storage key is purged from localStorage to avoid quota issues
    localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not save snapshot metadata to localStorage:', err);
  }
}

function notifySnapshotsUpdated(snapshots: AutoBackupSnapshot[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sbsc_auto_backup_snapshots_loaded', { detail: snapshots })
    );
  }
}

/**
 * Initializes the backup service, recovers existing data, and cleans up legacy storage.
 */
function initService() {
  if (isServiceInitialized || typeof window === 'undefined') return;
  isServiceInitialized = true;

  let legacySnapshots: AutoBackupSnapshot[] = [];

  // 1. Check for legacy bloated snapshots in localStorage and rescue them
  try {
    const legacy = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) {
        legacySnapshots = parsed;
        cachedSnapshots = parsed;
      }
      // IMMEDIATELY remove from localStorage to release several megabytes of quota
      localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
      console.info('🧹 Cleaned up legacy snapshot payloads from localStorage to free browser storage quota.');
    }
  } catch (err) {
    console.warn('Error migrating legacy snapshots from localStorage:', err);
    try {
      localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
    } catch (_) {}
  }

  // 2. Load lightweight metadata if cache is currently empty
  if (cachedSnapshots.length === 0) {
    try {
      const metaSaved = localStorage.getItem(METADATA_STORAGE_KEY);
      if (metaSaved) {
        const parsed = JSON.parse(metaSaved);
        if (Array.isArray(parsed)) {
          cachedSnapshots = parsed.map((m: any) => ({
            ...m,
            payload: null, // Will be filled from IndexedDB
          }));
        }
      }
    } catch (_) {}
  }

  // 3. Hydrate full payloads asynchronously from IndexedDB
  if (isIndexedDbSupported()) {
    getAllSnapshotsFromDb()
      .then(async (dbList) => {
        if (dbList.length > 0) {
          cachedSnapshots = dbList;
          saveMetadataToLocalStorage(cachedSnapshots);
          notifySnapshotsUpdated(cachedSnapshots);
        } else if (legacySnapshots.length > 0) {
          // Migrate legacy snapshots into IndexedDB
          for (const s of legacySnapshots) {
            await saveSnapshotToDb(s, 10);
          }
          cachedSnapshots = legacySnapshots;
          saveMetadataToLocalStorage(cachedSnapshots);
          notifySnapshotsUpdated(cachedSnapshots);
        }
      })
      .catch((err) => {
        console.warn('IndexedDB hydration failed:', err);
      });
  }
}

// Run init immediately on module load
initService();

// ============================================================================
// PUBLIC EXPORTED API
// ============================================================================

/**
 * Retrieves the current auto backup configuration from localStorage.
 */
export function getAutoBackupConfig(): AutoBackupConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_AUTO_BACKUP_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Error reading auto-backup config:', err);
  }
  return DEFAULT_AUTO_BACKUP_CONFIG;
}

/**
 * Saves auto backup configuration.
 */
export function saveAutoBackupConfig(updates: Partial<AutoBackupConfig>): AutoBackupConfig {
  const current = getAutoBackupConfig();
  const updated = { ...current, ...updates };
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving auto-backup config:', err);
  }
  return updated;
}

/**
 * Retrieves list of stored auto-backup snapshots (metadata + payload).
 */
export function getAutoBackupSnapshots(): AutoBackupSnapshot[] {
  initService();
  return cachedSnapshots.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Retrieves a full snapshot by ID, ensuring payload is populated from IndexedDB if needed.
 */
export async function getSnapshotById(snapshotId: string): Promise<AutoBackupSnapshot | null> {
  initService();
  const cached = cachedSnapshots.find((s) => s.id === snapshotId);
  if (cached && cached.payload) {
    return cached;
  }
  if (isIndexedDbSupported()) {
    try {
      const db = await openBackupDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(snapshotId);
        req.onsuccess = () => {
          const res = req.result as AutoBackupSnapshot | undefined;
          if (res && res.payload) {
            cachedSnapshots = cachedSnapshots.map((s) => (s.id === snapshotId ? res : s));
            resolve(res);
          } else {
            resolve(cached || null);
          }
        };
        req.onerror = () => resolve(cached || null);
      });
    } catch (_) {
      return cached || null;
    }
  }
  return cached || null;
}

/**
 * Creates and stores a new complete data snapshot.
 */
export function createAutoBackupSnapshot(
  fullData: any,
  reason: 'scheduled_interval' | 'manual_trigger' | 'data_mutation' = 'scheduled_interval'
): AutoBackupSnapshot {
  initService();
  const now = new Date();
  const timestamp = now.toISOString();
  const formattedDate = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const students = fullData?.students || [];
  const feePayments = fullData?.feePayments || [];
  const teachers = fullData?.teachers || [];
  const classes = fullData?.classes || [];

  const totalFeeRevenue = feePayments.reduce(
    (acc: number, f: any) => acc + (Number(f.amountPaid) || 0),
    0
  );
  const activeStudents = students.filter((s: any) => s.status === 'Active' || !s.status).length;

  let sizeKb = 10;
  try {
    const payloadString = JSON.stringify(fullData);
    sizeKb = Math.round((new Blob([payloadString]).size / 1024) * 10) / 10;
  } catch (_) {
    sizeKb = 25;
  }

  const snapshot: AutoBackupSnapshot = {
    id: `snapshot-${now.getTime()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp,
    formattedDate,
    reason,
    triggerReason: reason,
    summary: {
      totalStudents: students.length,
      activeStudents,
      totalFeePayments: feePayments.length,
      totalFeeRevenue,
      totalTeachers: teachers.length,
      totalClasses: classes.length,
      studentsCount: students.length,
      feePaymentsCount: feePayments.length,
      teachersCount: teachers.length,
    },
    sizeKb,
    payload: fullData,
  };

  const config = getAutoBackupConfig();
  const max = config.maxSnapshots || 10;

  // Prepend to in-memory cache and slice to max limit
  cachedSnapshots = [snapshot, ...cachedSnapshots.filter((s) => s.id !== snapshot.id)].slice(0, max);

  // Persist full snapshot with payload to IndexedDB (asynchronous, no 5MB limit!)
  if (isIndexedDbSupported()) {
    saveSnapshotToDb(snapshot, max).catch((err) => {
      console.warn('Error saving snapshot to IndexedDB:', err);
    });
  }

  // Save lightweight metadata in localStorage (NEVER stores large payload, avoids quota overflow!)
  saveMetadataToLocalStorage(cachedSnapshots);

  // Update last backup timestamp in config
  saveAutoBackupConfig({ lastBackupTime: timestamp });

  notifySnapshotsUpdated(cachedSnapshots);

  return snapshot;
}

/**
 * Checks whether an automated backup is currently due based on configured frequency.
 */
export function shouldRunAutoBackup(config: AutoBackupConfig): boolean {
  if (!config.enabled) return false;
  if (!config.lastBackupTime) return true;

  const lastTime = new Date(config.lastBackupTime).getTime();
  if (isNaN(lastTime)) return true;

  const now = Date.now();
  const elapsedMs = now - lastTime;

  switch (config.frequency) {
    case 'hourly':
      return elapsedMs >= 60 * 60 * 1000; // 1 hour
    case 'weekly':
      return elapsedMs >= 7 * 24 * 60 * 60 * 1000; // 7 days
    case 'daily':
    default:
      return elapsedMs >= 24 * 60 * 60 * 1000; // 24 hours
  }
}

/**
 * Checks and executes automated backup if due.
 */
export function checkAndExecuteAutoBackup(fullData: any): AutoBackupSnapshot | null {
  const config = getAutoBackupConfig();
  if (shouldRunAutoBackup(config)) {
    console.log('🔄 Auto-backup interval elapsed. Creating automated school data snapshot in IndexedDB...');
    return createAutoBackupSnapshot(fullData, 'scheduled_interval');
  }
  return null;
}

/**
 * Deletes a specific snapshot by ID.
 */
export function deleteAutoBackupSnapshot(snapshotId: string): AutoBackupSnapshot[] {
  initService();
  cachedSnapshots = cachedSnapshots.filter((s) => s.id !== snapshotId);
  saveMetadataToLocalStorage(cachedSnapshots);
  if (isIndexedDbSupported()) {
    deleteSnapshotFromDb(snapshotId).catch(() => {});
  }
  notifySnapshotsUpdated(cachedSnapshots);
  return cachedSnapshots;
}

/**
 * Clears all auto-backup history.
 */
export function clearAllAutoBackupSnapshots(): void {
  initService();
  cachedSnapshots = [];
  try {
    localStorage.removeItem(METADATA_STORAGE_KEY);
    localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
  } catch (_) {}
  if (isIndexedDbSupported()) {
    clearSnapshotsFromDb().catch(() => {});
  }
  notifySnapshotsUpdated([]);
}

/**
 * Downloads a snapshot as a JSON file to the user's computer.
 */
export function downloadSnapshotFile(snapshot: AutoBackupSnapshot, schoolName = 'SBSC-School'): void {
  const payloadToDownload = snapshot.payload || {
    info: 'Snapshot summary only',
    summary: snapshot.summary,
    timestamp: snapshot.timestamp,
  };
  const jsonStr = JSON.stringify(payloadToDownload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeDate = snapshot.timestamp ? snapshot.timestamp.slice(0, 10) : 'backup';
  a.download = `${schoolName}-AutoBackup-${safeDate}-${snapshot.id.slice(-6)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
