const HANDLE_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/

type MediaUrl = { url?: string; content_type?: string }
type Clip = {
  id?: string
  title?: string
  display_name?: string
  handle?: string
  is_public?: boolean
  image_url?: string
  display_tags?: string
  media_urls?: MediaUrl[]
  metadata?: { duration?: number; prompt?: string }
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
  const urls = clip.media_urls ?? []
  const preferred =
    urls.find((item) => item.url && (item.content_type?.includes('m4a') || item.url.endsWith('.m4a'))) ??
    urls.find((item) => Boolean(item.url))
  return preferred?.url ?? null
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
