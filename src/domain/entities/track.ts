export interface Track {
  id: string
  title: string
  artist: string
  handle: string
  audioUrl: string
  coverUrl: string
  duration: number
  tags: string
  lyrics?: string
  sunoUrl: string
}

export interface Artist {
  handle: string
  displayName: string
  avatarUrl: string
  description: string
  fetchedAt: string
}

export interface ArtistCatalog {
  artist: Artist
  tracks: Track[]
}

export interface LocalPlaylist {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  tracks: Track[]
}

export type TrackAvailabilityFilter = 'all' | 'local' | 'online'

export const DEMO_ARTIST_HANDLE = 'noty2686'
export const BULK_DOWNLOAD_WARNING_THRESHOLD = 10
export const ESTIMATED_MB_PER_TRACK = 8
