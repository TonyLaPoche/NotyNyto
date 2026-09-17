import { describe, expect, it } from 'vitest'
import { buildSunoProfileUrl, mapSunoProfileResponse } from '../adapters/sunoProfileAdapter'

describe('sunoProfileAdapter', () => {
  it('construit une URL profil Suno paginee', () => {
    expect(buildSunoProfileUrl('noty2686', 2)).toContain('/api/profiles/noty2686?')
    expect(buildSunoProfileUrl('noty2686', 2)).toContain('page=2')
  })

  it('mappe uniquement les clips publics avec audio media_urls', () => {
    const catalog = mapSunoProfileResponse(
      {
        display_name: 'Noty',
        handle: 'Noty2686',
        profile_description: 'bio',
        avatar_image_url: 'https://cdn/avatar.jpg',
        clips: [
          {
            id: 'public-1',
            title: 'Public Track',
            is_public: true,
            image_url: 'https://cdn/cover.jpg',
            display_tags: 'hyperpop',
            media_urls: [{ url: 'https://cdn/audio.m4a', content_type: 'm4a-opus' }],
            metadata: { duration: 12.5, prompt: 'lyrics here' },
          },
          {
            id: 'private-1',
            title: 'Private',
            is_public: false,
            media_urls: [{ url: 'https://cdn/private.m4a' }],
          },
          {
            id: 'no-audio',
            title: 'Broken',
            is_public: true,
            media_urls: [],
          },
          {
            title: 'Missing id',
            is_public: true,
            media_urls: [{ url: 'https://cdn/x.m4a' }],
          },
        ],
      },
      '2026-01-01T00:00:00.000Z',
    )

    expect(catalog.artist.handle).toBe('noty2686')
    expect(catalog.artist.displayName).toBe('Noty')
    expect(catalog.tracks).toHaveLength(1)
    expect(catalog.tracks[0]).toMatchObject({
      id: 'public-1',
      audioUrl: 'https://cdn/audio.m4a',
      lyrics: 'lyrics here',
      sunoUrl: 'https://suno.com/song/public-1',
    })
  })

  it('choisit le premier media_url disponible si pas de m4a explicite', () => {
    const catalog = mapSunoProfileResponse({
      handle: 'artist',
      clips: [
        {
          id: '1',
          title: 'Song',
          is_public: true,
          display_name: 'Clip Artist',
          handle: 'cliphandle',
          media_urls: [{ url: 'https://cdn/fallback.mp3' }],
          metadata: { prompt: '   ' },
        },
        {
          id: '2',
          title: 'Song 2',
          is_public: true,
          media_urls: [{ url: 'https://cdn/stream', content_type: 'm4a-opus' }],
        },
        {
          id: '3',
          title: 'No media field',
          is_public: true,
        },
      ],
    })
    expect(catalog.tracks).toHaveLength(2)
    expect(catalog.tracks[0].audioUrl).toBe('https://cdn/fallback.mp3')
    expect(catalog.tracks[0].artist).toBe('Clip Artist')
    expect(catalog.tracks[0].handle).toBe('cliphandle')
    expect(catalog.tracks[0].lyrics).toBeUndefined()
    expect(catalog.tracks[1].audioUrl).toBe('https://cdn/stream')
    expect(catalog.artist.displayName).toBe('artist')
  })

  it('supporte un profil sans clips', () => {
    const catalog = mapSunoProfileResponse({ handle: 'empty' })
    expect(catalog.tracks).toEqual([])
  })

  it('leve une erreur sur payload invalide ou sans handle', () => {
    expect(() => mapSunoProfileResponse(null)).toThrow('Reponse Suno invalide')
    expect(() => mapSunoProfileResponse({})).toThrow('Profil Suno introuvable')
  })
})
