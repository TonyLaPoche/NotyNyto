import { describe, expect, it, vi } from 'vitest'
import { fetchPublicArtistCatalog } from './fetchPublicArtistCatalog'

describe('fetchPublicArtistCatalog', () => {
  it('appelle le proxy et retourne le catalogue', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        artist: {
          handle: 'noty2686',
          displayName: 'Noty',
          avatarUrl: '',
          description: '',
          fetchedAt: '2026-01-01T00:00:00.000Z',
        },
        tracks: [],
      }),
    })

    const catalog = await fetchPublicArtistCatalog('@noty2686', fetcher as unknown as typeof fetch)
    expect(fetcher).toHaveBeenCalledWith('/api/suno/profile?handle=noty2686')
    expect(catalog.artist.handle).toBe('noty2686')
  })

  it('rejette un handle invalide', async () => {
    await expect(fetchPublicArtistCatalog('x')).rejects.toThrow('Handle ou URL artiste invalide')
  })

  it('remonte une erreur proxy', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Artiste introuvable' }),
    })
    await expect(fetchPublicArtistCatalog('missingartist', fetcher as unknown as typeof fetch)).rejects.toThrow(
      'Artiste introuvable',
    )
  })

  it('utilise un message generique si error absente', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })
    await expect(fetchPublicArtistCatalog('missingartist', fetcher as unknown as typeof fetch)).rejects.toThrow(
      'Echec du scan artiste',
    )
  })
})
