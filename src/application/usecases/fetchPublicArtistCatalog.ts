import type { ArtistCatalog } from '../../domain/entities/track'
import { parseArtistInput } from './parseArtistInput'

export async function fetchPublicArtistCatalog(
  input: string,
  fetcher: typeof fetch = fetch,
): Promise<ArtistCatalog> {
  const handle = parseArtistInput(input)
  if (!handle) {
    throw new Error('Handle ou URL artiste invalide')
  }

  const response = await fetcher(`/api/suno/profile?handle=${encodeURIComponent(handle)}`)
  const rawText = await response.text()

  let payload: ArtistCatalog | { error?: string }
  try {
    payload = JSON.parse(rawText) as ArtistCatalog | { error?: string }
  } catch {
    throw new Error(
      response.ok
        ? 'Reponse API invalide'
        : `API indisponible (${response.status}). Redeploy Vercel avec le dossier /api.`,
    )
  }

  if (!response.ok) {
    const message = 'error' in payload && payload.error ? payload.error : 'Echec du scan artiste'
    throw new Error(message)
  }

  return payload as ArtistCatalog
}
