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

export const DEMO_ARTIST_HANDLE = 'noty2686'
