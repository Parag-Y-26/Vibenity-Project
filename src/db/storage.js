import { openDB } from 'idb';

const DB_NAME = 'OfflineFormValidator';
const DB_VERSION = 1;

// Database initialization
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Entries store (staging area)
      if (!db.objectStoreNames.contains('entries')) {
        const entryStore = db.createObjectStore('entries', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        entryStore.createIndex('status', 'status');
        entryStore.createIndex('confidence', 'confidence');
        entryStore.createIndex('createdAt', 'createdAt');
      }

      // Quarantine store
      if (!db.objectStoreNames.contains('quarantine')) {
        const quarantineStore = db.createObjectStore('quarantine', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        quarantineStore.createIndex('severity', 'severity');
        quarantineStore.createIndex('createdAt', 'createdAt');
      }

      // Validated store (ready for sync)
      if (!db.objectStoreNames.contains('validated')) {
        const validatedStore = db.createObjectStore('validated', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        validatedStore.createIndex('syncStatus', 'syncStatus');
        validatedStore.createIndex('createdAt', 'createdAt');
      }

      // Audit log store
      if (!db.objectStoreNames.contains('auditLog')) {
        const auditStore = db.createObjectStore('auditLog', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        auditStore.createIndex('entryId', 'entryId');
        auditStore.createIndex('timestamp', 'timestamp');
        auditStore.createIndex('action', 'action');
      }

      // Validation rules store
      if (!db.objectStoreNames.contains('validationRules')) {
        const rulesStore = db.createObjectStore('validationRules', { 
          keyPath: 'id' 
        });
        rulesStore.createIndex('category', 'category');
      }

      // Sync history store
      if (!db.objectStoreNames.contains('syncHistory')) {
        const syncStore = db.createObjectStore('syncHistory', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('timestamp', 'timestamp');
      }
    },
  });
}

// Entry operations
export async function createEntry(entry) {
  const db = await initDB();
  const id = await db.add('entries', entry);
  return { ...entry, id };
}

export async function getEntry(id) {
  const db = await initDB();
  return db.get('entries', id);
}

export async function getAllEntries() {
  const db = await initDB();
  return db.getAll('entries');
}

export async function updateEntry(id, updates) {
  const db = await initDB();
  const entry = await db.get('entries', id);
  if (!entry) throw new Error('Entry not found');
  
  const updated = { ...entry, ...updates, updatedAt: Date.now() };
  await db.put('entries', updated);
  return updated;
}

export async function deleteEntry(id) {
  const db = await initDB();
  await db.delete('entries', id);
}

// Quarantine operations
export async function moveToQuarantine(entry) {
  const db = await initDB();
  const tx = db.transaction(['entries', 'quarantine'], 'readwrite');
  
  await tx.objectStore('quarantine').add({
    ...entry,
    quarantinedAt: Date.now()
  });
  
  await tx.objectStore('entries').delete(entry.id);
  await tx.done;
}

export async function getAllQuarantined() {
  const db = await initDB();
  return db.getAll('quarantine');
}

export async function getQuarantinedEntry(id) {
  const db = await initDB();
  return db.get('quarantine', id);
}

export async function updateQuarantinedEntry(id, updates) {
  const db = await initDB();
  const entry = await db.get('quarantine', id);
  if (!entry) throw new Error('Quarantined entry not found');
  
  const updated = { ...entry, ...updates, updatedAt: Date.now() };
  await db.put('quarantine', updated);
  return updated;
}

export async function removeFromQuarantine(id) {
  const db = await initDB();
  const entry = await db.get('quarantine', id);
  if (!entry) throw new Error('Quarantined entry not found');
  
  const tx = db.transaction(['quarantine', 'entries'], 'readwrite');
  await tx.objectStore('entries').add({
    ...entry,
    status: 'staging',
    resolvedAt: Date.now()
  });
  await tx.objectStore('quarantine').delete(id);
  await tx.done;
  
  return entry;
}

// Validated (sync-ready) operations
export async function moveToValidated(entry) {
  const db = await initDB();
  const tx = db.transaction(['entries', 'validated'], 'readwrite');
  
  await tx.objectStore('validated').add({
    ...entry,
    validatedAt: Date.now(),
    syncStatus: 'pending'
  });
  
  await tx.objectStore('entries').delete(entry.id);
  await tx.done;
}

export async function getAllValidated() {
  const db = await initDB();
  return db.getAll('validated');
}

export async function markAsSynced(id) {
  const db = await initDB();
  const entry = await db.get('validated', id);
  if (!entry) throw new Error('Validated entry not found');
  
  const updated = { ...entry, syncStatus: 'synced', syncedAt: Date.now() };
  await db.put('validated', updated);
  return updated;
}

// Audit log operations
export async function addAuditLog(log) {
  const db = await initDB();
  return db.add('auditLog', {
    ...log,
    timestamp: Date.now()
  });
}

export async function getAuditLogForEntry(entryId) {
  const db = await initDB();
  const index = db.transaction('auditLog').store.index('entryId');
  return index.getAll(entryId);
}

export async function getAllAuditLogs() {
  const db = await initDB();
  return db.getAll('auditLog');
}

// Validation rules operations
export async function saveValidationRule(rule) {
  const db = await initDB();
  await db.put('validationRules', rule);
}

export async function getValidationRule(id) {
  const db = await initDB();
  return db.get('validationRules', id);
}

export async function getAllValidationRules() {
  const db = await initDB();
  return db.getAll('validationRules');
}

export async function deleteValidationRule(id) {
  const db = await initDB();
  await db.delete('validationRules', id);
}

// Sync history operations
export async function addSyncHistory(record) {
  const db = await initDB();
  return db.add('syncHistory', {
    ...record,
    timestamp: Date.now()
  });
}

export async function getAllSyncHistory() {
  const db = await initDB();
  return db.getAll('syncHistory');
}

// Statistics
export async function getStats() {
  const db = await initDB();
  const [entries, quarantined, validated, auditLogs] = await Promise.all([
    db.count('entries'),
    db.count('quarantine'),
    db.count('validated'),
    db.count('auditLog')
  ]);
  
  return {
    totalEntries: entries,
    quarantinedCount: quarantined,
    validatedCount: validated,
    auditLogCount: auditLogs
  };
}

// Bulk operations
export async function clearAllData() {
  const db = await initDB();
  const stores = ['entries', 'quarantine', 'validated', 'auditLog', 'syncHistory'];
  
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map(store => tx.objectStore(store).clear()));
  await tx.done;
}
