const HANDLE_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/

type MediaUrl = { url?: string; content_type?: string; encoding?: string }
type Clip = {
  id?: string
  title?: string
  display_name?: string
  handle?: string
  is_public?: boolean
  image_url?: string
  display_tags?: string
  video_url?: string
  media_urls?: MediaUrl[]
  metadata?: { duration?: number; prompt?: string }
}

function isBrowserPlayableAudioUrl(url: string): boolean {
  if (!url || url.includes('/api/forbidden')) return false
  if (/cloudfront\.net\/.+\/clip\/.+\.m4a(\?|$)/i.test(url)) return false
  return true
}

function fallbackMp4Url(trackId: string): string {
  return `https://cdn1.suno.ai/${trackId}.mp4`
}

function parseHandle(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let candidate = trimmed
  try {
    if (/suno\.com/i.test(candidate)) {
      const withProtocol = candidate.startsWith('http') ? candidate : `https://${candidate}`
      const url = new URL(withProtocol)
      if (!url.hostname.includes('suno.com')) return null
      const match = url.pathname.match(/\/@([^/]+)/)
      if (!match) return null
      candidate = match[1]
    }
  } catch {
    return null
  }

  if (candidate.startsWith('@')) candidate = candidate.slice(1)
  candidate = (candidate.split(/[?#/]/)[0] ?? '').trim()
  if (!HANDLE_PATTERN.test(candidate)) return null
  return candidate.toLowerCase()
}

function pickAudioUrl(clip: Clip): string | null {
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

function mapProfile(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Reponse Suno invalide')
  }

  const data = raw as {
    display_name?: string
    handle?: string
    profile_description?: string
    avatar_image_url?: string
    clips?: Clip[]
  }

  const handle = data.handle?.toLowerCase()
  if (!handle) throw new Error('Profil Suno introuvable')

  const displayName = data.display_name ?? handle
  const tracks = (data.clips ?? [])
    .map((clip) => {
      if (!clip.id || !clip.title || clip.is_public !== true) return null
      const audioUrl = pickAudioUrl(clip)
      if (!audioUrl) return null
      const lyrics = clip.metadata?.prompt?.trim()
      return {
        id: clip.id,
        title: clip.title,
        artist: clip.display_name ?? displayName,
        handle: (clip.handle ?? handle).toLowerCase(),
        audioUrl,
        coverUrl: clip.image_url ?? '',
        duration: Number(clip.metadata?.duration ?? 0),
        tags: clip.display_tags ?? '',
        lyrics: lyrics || undefined,
        sunoUrl: `https://suno.com/song/${clip.id}`,
      }
    })
    .filter((track): track is NonNullable<typeof track> => track !== null)

  return {
    artist: {
      handle,
      displayName,
      avatarUrl: data.avatar_image_url ?? '',
      description: data.profile_description ?? '',
      fetchedAt: new Date().toISOString(),
    },
    tracks,
  }
}

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const url = new URL(request.url)
  const rawHandle = url.searchParams.get('handle') ?? ''
  const handle = parseHandle(rawHandle) ?? (HANDLE_PATTERN.test(rawHandle) ? rawHandle.toLowerCase() : null)
  if (!handle) {
    return Response.json({ error: 'Handle invalide' }, { status: 400 })
  }

  const page = Number(url.searchParams.get('page') ?? '1') || 1
  const sunoUrl = `https://studio-api.prod.suno.com/api/profiles/${encodeURIComponent(handle)}?playlists_sort_by=created_at&clips_sort_by=created_at&page=${page}`

  try {
    const response = await fetch(sunoUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SunoPublicPlayer/1.0',
      },
    })

    if (response.status === 404) {
      return Response.json({ error: 'Artiste introuvable' }, { status: 404 })
    }

    if (!response.ok) {
      return Response.json({ error: 'Suno a refuse la requete publique' }, { status: 502 })
    }

    const payload = await response.json()
    const catalog = mapProfile(payload)

    return Response.json(catalog, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
      },
    })
  } catch {
    return Response.json({ error: 'Impossible de lire le profil public Suno' }, { status: 502 })
  }
}
