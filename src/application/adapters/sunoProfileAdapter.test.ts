import { describe, expect, it } from 'vitest'
import {
  buildSunoProfileUrl,
  mapSunoProfileResponse,
  toPlayableAudioUrl,
} from '../adapters/sunoProfileAdapter'

describe('sunoProfileAdapter', () => {
  it('construit une URL profil Suno paginee', () => {
    expect(buildSunoProfileUrl('noty2686', 2)).toContain('/api/profiles/noty2686?')
    expect(buildSunoProfileUrl('noty2686', 2)).toContain('page=2')
  })

  it('prefere video_url mp4 aux m4a-opus encodes', () => {
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
            video_url: 'https://cdn1.suno.ai/public-1.mp4',
            media_urls: [
              {
                url: 'https://d2lwuy8qc234o3.cloudfront.net/1/clip/public-1.m4a',
                content_type: 'm4a-opus',
              },
            ],
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
    expect(catalog.tracks).toHaveLength(2)
    expect(catalog.tracks[0]).toMatchObject({
      id: 'public-1',
      audioUrl: 'https://cdn1.suno.ai/public-1.mp4',
      lyrics: 'lyrics here',
      sunoUrl: 'https://suno.com/song/public-1',
    })
    expect(catalog.tracks[1].audioUrl).toBe('https://cdn1.suno.ai/no-audio.mp4')
  })

  it('choisit le premier media_url navigable si pas de video', () => {
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
          media_urls: [
            {
              url: 'https://d2lwuy8qc234o3.cloudfront.net/1/clip/2.m4a',
              content_type: 'm4a-opus',
            },
          ],
        },
      ],
    })
    expect(catalog.tracks).toHaveLength(2)
    expect(catalog.tracks[0].audioUrl).toBe('https://cdn/fallback.mp3')
    expect(catalog.tracks[0].artist).toBe('Clip Artist')
    expect(catalog.tracks[0].handle).toBe('cliphandle')
    expect(catalog.tracks[0].lyrics).toBeUndefined()
    expect(catalog.tracks[1].audioUrl).toBe('https://cdn1.suno.ai/2.mp4')
    expect(catalog.artist.displayName).toBe('artist')
  })

  it('convertit les anciennes urls cloudfront m4a', () => {
    expect(
      toPlayableAudioUrl('abc', 'https://d2lwuy8qc234o3.cloudfront.net/1/clip/abc.m4a'),
    ).toBe('https://cdn1.suno.ai/abc.mp4')
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
