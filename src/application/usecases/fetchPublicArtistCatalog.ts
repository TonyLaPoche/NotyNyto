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
  const payload = (await response.json()) as ArtistCatalog | { error?: string }

  if (!response.ok) {
    const message = 'error' in payload && payload.error ? payload.error : 'Echec du scan artiste'
    throw new Error(message)
  }

  return payload as ArtistCatalog
}
