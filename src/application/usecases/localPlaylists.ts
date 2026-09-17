import type { LocalPlaylist, Track } from '../../domain/entities/track'

const PLAYLISTS_KEY = 'suno-public-player.playlists.v1'

export interface PlaylistStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function getStore(store?: PlaylistStore): PlaylistStore {
  return (
    store ?? {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    }
  )
}

function readAll(store?: PlaylistStore): LocalPlaylist[] {
  const raw = getStore(store).getItem(PLAYLISTS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as LocalPlaylist[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(playlists: LocalPlaylist[], store?: PlaylistStore): LocalPlaylist[] {
  getStore(store).setItem(PLAYLISTS_KEY, JSON.stringify(playlists))
  return playlists
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function listPlaylists(store?: PlaylistStore): LocalPlaylist[] {
  return readAll(store)
}

export function getPlaylist(id: string, store?: PlaylistStore): LocalPlaylist | null {
  return readAll(store).find((item) => item.id === id) ?? null
}

export function createPlaylist(name: string, tracks: Track[] = [], store?: PlaylistStore): LocalPlaylist[] {
  const trimmed = name.trim() || 'Nouvelle playlist'
  const now = new Date().toISOString()
  const playlist: LocalPlaylist = {
    id: createId(),
    name: trimmed,
    createdAt: now,
    updatedAt: now,
    tracks: dedupeTracks(tracks),
  }
  return writeAll([playlist, ...readAll(store)], store)
}

export function renamePlaylist(id: string, name: string, store?: PlaylistStore): LocalPlaylist[] {
  const trimmed = name.trim()
  if (!trimmed) return readAll(store)
  const next = readAll(store).map((item) =>
    item.id === id ? { ...item, name: trimmed, updatedAt: new Date().toISOString() } : item,
  )
  return writeAll(next, store)
}

export function deletePlaylist(id: string, store?: PlaylistStore): LocalPlaylist[] {
  return writeAll(
    readAll(store).filter((item) => item.id !== id),
    store,
  )
}

export function addTrackToPlaylist(playlistId: string, track: Track, store?: PlaylistStore): LocalPlaylist[] {
  const next = readAll(store).map((item) => {
    if (item.id !== playlistId) return item
    if (item.tracks.some((entry) => entry.id === track.id)) return item
    return {
      ...item,
      updatedAt: new Date().toISOString(),
      tracks: [...item.tracks, track],
    }
  })
  return writeAll(next, store)
}

export function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
  store?: PlaylistStore,
): LocalPlaylist[] {
  const next = readAll(store).map((item) => {
    if (item.id !== playlistId) return item
    return {
      ...item,
      updatedAt: new Date().toISOString(),
      tracks: item.tracks.filter((track) => track.id !== trackId),
    }
  })
  return writeAll(next, store)
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>()
  const result: Track[] = []
  for (const track of tracks) {
    if (seen.has(track.id)) continue
    seen.add(track.id)
    result.push(track)
  }
  return result
}
