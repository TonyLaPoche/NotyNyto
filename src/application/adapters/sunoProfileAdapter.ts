import type { Artist, ArtistCatalog, Track } from '../../domain/entities/track'

interface SunoMediaUrl {
  url?: string
  content_type?: string
  encoding?: string
}

interface SunoClip {
  id?: string
  title?: string
  display_name?: string
  handle?: string
  is_public?: boolean
  image_url?: string
  display_tags?: string
  video_url?: string
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

/** Les streams m4a-opus encodes Suno ne sont pas lisibles dans un <audio> navigateur. */
export function isBrowserPlayableAudioUrl(url: string): boolean {
  if (!url || url.includes('/api/forbidden')) return false
  if (/cloudfront\.net\/.+\/clip\/.+\.m4a(\?|$)/i.test(url)) return false
  return true
}

export function fallbackMp4Url(trackId: string): string {
  return `https://cdn1.suno.ai/${trackId}.mp4`
}

export function toPlayableAudioUrl(trackId: string, audioUrl: string): string {
  if (isBrowserPlayableAudioUrl(audioUrl)) return audioUrl
  return fallbackMp4Url(trackId)
}

function pickAudioUrl(clip: SunoClip): string | null {
  const videoUrl = clip.video_url?.trim()
  if (videoUrl && isBrowserPlayableAudioUrl(videoUrl)) {
    return videoUrl
  }

  const urls = clip.media_urls ?? []
  const progressive =
    urls.find(
      (item) =>
        item.url &&
        isBrowserPlayableAudioUrl(item.url) &&
        !String(item.content_type ?? '').includes('opus'),
    ) ?? urls.find((item) => item.url && isBrowserPlayableAudioUrl(item.url))

  if (progressive?.url) return progressive.url
  if (clip.id) return fallbackMp4Url(clip.id)
  return null
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
