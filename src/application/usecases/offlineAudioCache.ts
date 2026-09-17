import { toPlayableAudioUrl } from '../adapters/sunoProfileAdapter'

const DB_NAME = 'suno-public-player-audio'
const STORE_NAME = 'tracks'
const DB_VERSION = 1

export interface CachedAudioRecord {
  trackId: string
  buffer: ArrayBuffer
  mimeType: string
  cachedAt: string
  byteLength: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      /* c8 ignore next */
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'trackId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    /* c8 ignore next */
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    /* c8 ignore next */
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

async function readResponseBuffer(
  response: Response,
  onProgress?: (percent: number) => void,
): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  const headerType = response.headers?.get?.('content-type') ?? ''
  const total = Number(response.headers?.get?.('content-length') || 0)

  if (response.body && total > 0 && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      chunks.push(value)
      received += value.byteLength
      onProgress?.(Math.min(99, Math.round((received / total) * 100)))
    }

    const merged = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.byteLength
    }

    onProgress?.(100)
    return { buffer: merged.buffer, mimeType: headerType || 'audio/mp4' }
  }

  const blob = await response.blob()
  onProgress?.(100)
  return {
    buffer: await blob.arrayBuffer(),
    mimeType: headerType || blob.type || 'audio/mp4',
  }
}

export async function cacheTrackAudio(
  trackId: string,
  audioUrl: string,
  fetcher: typeof fetch = fetch,
  onProgress?: (percent: number) => void,
): Promise<CachedAudioRecord> {
  const playableUrl = toPlayableAudioUrl(trackId, audioUrl)
  const response = await fetcher(playableUrl)
  if (!response.ok) {
    throw new Error('Telechargement audio impossible')
  }

  const { buffer, mimeType } = await readResponseBuffer(response, onProgress)
  const record: CachedAudioRecord = {
    trackId,
    buffer,
    mimeType,
    cachedAt: new Date().toISOString(),
    byteLength: buffer.byteLength,
  }

  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await requestToPromise(tx.objectStore(STORE_NAME).put(record))
  } finally {
    db.close()
  }

  return record
}

export async function getCachedTrackAudio(trackId: string): Promise<CachedAudioRecord | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const result = await requestToPromise(tx.objectStore(STORE_NAME).get(trackId))
    return (result as CachedAudioRecord | undefined) ?? null
  } finally {
    db.close()
  }
}

export async function listCachedTrackIds(): Promise<string[]> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const keys = await requestToPromise(tx.objectStore(STORE_NAME).getAllKeys())
    return keys.map(String)
  } finally {
    db.close()
  }
}

export async function removeCachedTrackAudio(trackId: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await requestToPromise(tx.objectStore(STORE_NAME).delete(trackId))
  } finally {
    db.close()
  }
}

export async function clearCachedAudio(): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await requestToPromise(tx.objectStore(STORE_NAME).clear())
  } finally {
    db.close()
  }
}

export async function getCachedAudioByteLength(): Promise<number> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const records = (await requestToPromise(tx.objectStore(STORE_NAME).getAll())) as CachedAudioRecord[]
    return records.reduce((sum, item) => sum + item.byteLength, 0)
  } finally {
    db.close()
  }
}

export async function resolvePlayableUrl(trackId: string, remoteUrl: string): Promise<string> {
  const cached = await getCachedTrackAudio(trackId)
  if (cached) {
    return URL.createObjectURL(new Blob([cached.buffer], { type: cached.mimeType }))
  }
  return toPlayableAudioUrl(trackId, remoteUrl)
}
