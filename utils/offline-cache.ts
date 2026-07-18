const DB_NAME = 'fate-offline-v1'
const DB_VERSION = 1
const ACTIVE_USER_KEY = 'ziwei:offline-active-user'
const MAX_SNAPSHOTS_PER_USER = 100
const OFFLINE_SESSION_TTL = 30 * 24 * 60 * 60 * 1000

type OfflineAccountRecord = {
  userUuid: string
  profile: Record<string, unknown>
  updatedAt: number
}

type OfflineSnapshotRecord = {
  id: string
  userUuid: string
  requestKey: string
  payload: unknown
  updatedAt: number
}

function toIndexedDbValue<T>(value: T): T {
  // Vue/Pinia may wrap state in a Proxy, which IndexedDB cannot structured-clone.
  // API/profile data is JSON-shaped, so serializing also strips reactive wrappers.
  return JSON.parse(JSON.stringify(value)) as T
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'userUuid' })
      }
      if (!db.objectStoreNames.contains('apiSnapshots')) {
        const store = db.createObjectStore('apiSnapshots', { keyPath: 'id' })
        store.createIndex('byUser', 'userUuid')
      }
    }
  })
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function getOfflineActiveUserUuid() {
  if (!import.meta.client) return null
  try {
    const session = JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null') as { userUuid?: string; expiresAt?: number } | null
    if (!session?.userUuid || Number(session.expiresAt || 0) <= Date.now()) {
      localStorage.removeItem(ACTIVE_USER_KEY)
      return null
    }
    return session.userUuid
  } catch {
    // Remove the legacy plain UUID marker: it allowed cached personal data to be
    // restored without any bounded local session.
    localStorage.removeItem(ACTIVE_USER_KEY)
    return null
  }
}

export function saveOfflineSession(userUuid: string) {
  if (!import.meta.client || !userUuid) return
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify({
    userUuid,
    expiresAt: Date.now() + OFFLINE_SESSION_TTL,
  }))
}

export function isOfflineSnapshotPath(path: string) {
  let pathname = path
  try {
    pathname = new URL(path, location.origin).pathname
  } catch { /* Keep the supplied relative path. */ }
  return pathname === '/users/me'
    || pathname === '/ziwei/records/detail'
    || pathname === '/ziwei/qa/chats'
    || /^\/ziwei\/qa\/history\/[^/]+$/.test(pathname)
    || pathname === '/ziwei/match/records'
    || /^\/ziwei\/match\/records\/[^/]+$/.test(pathname)
    || /^\/ziwei\/flow\/record\/[^/]+$/.test(pathname)
}

export function offlineRequestKey(path: string) {
  const url = new URL(path, import.meta.client ? location.origin : 'https://offline.invalid')
  const search = [...url.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
  const query = new URLSearchParams(search).toString()
  return `${url.pathname}${query ? `?${query}` : ''}`
}

export async function saveOfflineAccount(userUuid: string, profile: Record<string, unknown>) {
  if (!import.meta.client || !userUuid) return
  const db = await openDatabase()
  const transaction = db.transaction('accounts', 'readwrite')
  transaction.objectStore('accounts').put({
    userUuid,
    profile: toIndexedDbValue(profile),
    updatedAt: Date.now(),
  } satisfies OfflineAccountRecord)
  await transactionDone(transaction)
  db.close()
}

export async function loadOfflineAccount(userUuid = getOfflineActiveUserUuid()) {
  if (!import.meta.client || !userUuid) return null
  const db = await openDatabase()
  const transaction = db.transaction('accounts', 'readonly')
  const account = await requestResult(transaction.objectStore('accounts').get(userUuid)) as OfflineAccountRecord | undefined
  await transactionDone(transaction)
  db.close()
  return account || null
}

export async function saveOfflineSnapshot(userUuid: string, path: string, payload: unknown) {
  if (!import.meta.client || !userUuid || !isOfflineSnapshotPath(path)) return
  const requestKey = offlineRequestKey(path)
  const db = await openDatabase()
  const transaction = db.transaction('apiSnapshots', 'readwrite')
  const store = transaction.objectStore('apiSnapshots')
  store.put({
    id: `${userUuid}::${requestKey}`,
    userUuid,
    requestKey,
    payload: toIndexedDbValue(payload),
    updatedAt: Date.now(),
  } satisfies OfflineSnapshotRecord)
  await transactionDone(transaction)

  const pruneTransaction = db.transaction('apiSnapshots', 'readwrite')
  const pruneStore = pruneTransaction.objectStore('apiSnapshots')
  const records = await requestResult(pruneStore.index('byUser').getAll(userUuid)) as OfflineSnapshotRecord[]
  records.sort((left, right) => right.updatedAt - left.updatedAt)
  for (const record of records.slice(MAX_SNAPSHOTS_PER_USER)) pruneStore.delete(record.id)
  await transactionDone(pruneTransaction)
  db.close()
}

export async function loadOfflineSnapshot<T>(userUuid: string, path: string) {
  if (!import.meta.client || !userUuid || !isOfflineSnapshotPath(path)) return null
  const requestKey = offlineRequestKey(path)
  const db = await openDatabase()
  const transaction = db.transaction('apiSnapshots', 'readonly')
  const record = await requestResult(transaction.objectStore('apiSnapshots').get(`${userUuid}::${requestKey}`)) as OfflineSnapshotRecord | undefined
  await transactionDone(transaction)
  db.close()
  return record ? { payload: record.payload as T, updatedAt: record.updatedAt } : null
}

export async function clearOfflineUser(userUuid: string) {
  if (!import.meta.client || !userUuid) return
  const db = await openDatabase()
  const readTransaction = db.transaction('apiSnapshots', 'readonly')
  const keys = await requestResult(readTransaction.objectStore('apiSnapshots').index('byUser').getAllKeys(userUuid))
  await transactionDone(readTransaction)
  const deleteTransaction = db.transaction(['accounts', 'apiSnapshots'], 'readwrite')
  deleteTransaction.objectStore('accounts').delete(userUuid)
  for (const key of keys) deleteTransaction.objectStore('apiSnapshots').delete(key)
  await transactionDone(deleteTransaction)
  db.close()
  if (getOfflineActiveUserUuid() === userUuid) localStorage.removeItem(ACTIVE_USER_KEY)
}

export async function clearAllOfflineData() {
  if (!import.meta.client) return
  localStorage.removeItem(ACTIVE_USER_KEY)
  const db = await openDatabase()
  const transaction = db.transaction(['accounts', 'apiSnapshots'], 'readwrite')
  transaction.objectStore('accounts').clear()
  transaction.objectStore('apiSnapshots').clear()
  await transactionDone(transaction)
  db.close()
}
