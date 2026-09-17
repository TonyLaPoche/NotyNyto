import type { Artist, ArtistCatalog, Track } from '../../domain/entities/track'

interface SunoMediaUrl {
  url?: string
  content_type?: string
}

interface SunoClip {
  id?: string
  title?: string
  display_name?: string
  handle?: string
  is_public?: boolean
  image_url?: string
  display_tags?: string
  media_urls?: SunoMediaUrl[]
  metadata?: {
    duration?: number
    prompt?: string
  }
}

interface SunoProfileResponse {
  display_name?: string
  handle?: string
  profile_description?: string
  avatar_image_url?: string
  clips?: SunoClip[]
}

function pickAudioUrl(clip: SunoClip): string | null {
  const urls = clip.media_urls ?? []
  const preferred =
    urls.find((item) => item.url && (item.content_type?.includes('m4a') || item.url.endsWith('.m4a'))) ??
    urls.find((item) => Boolean(item.url))
  return preferred?.url ?? null
}

function mapClip(clip: SunoClip, fallbackHandle: string, fallbackArtist: string): Track | null {
  if (!clip.id || !clip.title || clip.is_public !== true) return null
  const audioUrl = pickAudioUrl(clip)
  if (!audioUrl) return null

  const handle = (clip.handle ?? fallbackHandle).toLowerCase()
  const artist = clip.display_name ?? fallbackArtist
  const lyrics = clip.metadata?.prompt?.trim()

  return {
    id: clip.id,
    title: clip.title,
    artist,
    handle,
    audioUrl,
    coverUrl: clip.image_url ?? '',
    duration: Number(clip.metadata?.duration ?? 0),
    tags: clip.display_tags ?? '',
    lyrics: lyrics || undefined,
    sunoUrl: `https://suno.com/song/${clip.id}`,
  }
}

export function mapSunoProfileResponse(raw: unknown, fetchedAt = new Date().toISOString()): ArtistCatalog {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Reponse Suno invalide')
  }

  const data = raw as SunoProfileResponse
  const handle = data.handle?.toLowerCase()
  if (!handle) {
    throw new Error('Profil Suno introuvable')
  }

  const displayName = data.display_name ?? handle
  const artist: Artist = {
    handle,
    displayName,
    avatarUrl: data.avatar_image_url ?? '',
    description: data.profile_description ?? '',
    fetchedAt,
  }

  const tracks = (data.clips ?? [])
    .map((clip) => mapClip(clip, handle, displayName))
    .filter((track): track is Track => track !== null)

  return { artist, tracks }
}

export function buildSunoProfileUrl(handle: string, page = 1): string {
  const params = new URLSearchParams({
    playlists_sort_by: 'created_at',
    clips_sort_by: 'created_at',
    page: String(page),
  })
  return `https://studio-api.prod.suno.com/api/profiles/${encodeURIComponent(handle)}?${params}`
}
