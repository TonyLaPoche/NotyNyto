import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildSunoProfileUrl, mapSunoProfileResponse } from '../../src/application/adapters/sunoProfileAdapter'
import { parseArtistInput } from '../../src/application/usecases/parseArtistInput'

const HANDLE_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawHandle = typeof req.query.handle === 'string' ? req.query.handle : ''
  const handle = parseArtistInput(rawHandle) ?? (HANDLE_PATTERN.test(rawHandle) ? rawHandle.toLowerCase() : null)
  if (!handle) {
    return res.status(400).json({ error: 'Handle invalide' })
  }

  const page = Number(typeof req.query.page === 'string' ? req.query.page : '1') || 1

  try {
    const response = await fetch(buildSunoProfileUrl(handle, page), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SunoPublicPlayer/1.0',
      },
    })

    if (response.status === 404) {
      return res.status(404).json({ error: 'Artiste introuvable' })
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'Suno a refuse la requete publique' })
    }

    const payload = await response.json()
    const catalog = mapSunoProfileResponse(payload)

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300')
    return res.status(200).json(catalog)
  } catch {
    return res.status(502).json({ error: "Impossible de lire le profil public Suno" })
  }
}
