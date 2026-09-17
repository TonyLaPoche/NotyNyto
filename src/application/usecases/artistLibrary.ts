import type { ArtistCatalog } from '../../domain/entities/track'

const LIBRARY_KEY = 'suno-public-player.library.v1'

export interface ArtistLibraryStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function getStore(store?: ArtistLibraryStore): ArtistLibraryStore {
  return (
    store ?? {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    }
  )
}

export function listArtistCatalogs(store?: ArtistLibraryStore): ArtistCatalog[] {
  const raw = getStore(store).getItem(LIBRARY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ArtistCatalog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getArtistCatalog(handle: string, store?: ArtistLibraryStore): ArtistCatalog | null {
  const normalized = handle.toLowerCase()
  return listArtistCatalogs(store).find((entry) => entry.artist.handle === normalized) ?? null
}

export function saveArtistCatalog(catalog: ArtistCatalog, store?: ArtistLibraryStore): ArtistCatalog[] {
  const storage = getStore(store)
  const current = listArtistCatalogs(storage).filter((entry) => entry.artist.handle !== catalog.artist.handle)
  const next = [catalog, ...current]
  storage.setItem(LIBRARY_KEY, JSON.stringify(next))
  return next
}

export function removeArtistCatalog(handle: string, store?: ArtistLibraryStore): ArtistCatalog[] {
  const storage = getStore(store)
  const next = listArtistCatalogs(storage).filter((entry) => entry.artist.handle !== handle.toLowerCase())
  storage.setItem(LIBRARY_KEY, JSON.stringify(next))
  return next
}

export function clearArtistLibrary(store?: ArtistLibraryStore): void {
  getStore(store).removeItem(LIBRARY_KEY)
}
