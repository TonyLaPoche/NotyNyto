import { describe, expect, it } from 'vitest'
import { buildSharePayload } from './buildSharePayload'

describe('buildSharePayload', () => {
  it('construit un payload de partage neutre', () => {
    const payload = buildSharePayload(
      {
        id: '1',
        title: 'Track',
        artist: 'Noty',
        handle: 'noty2686',
        audioUrl: 'https://cdn/a.m4a',
        coverUrl: '',
        duration: 10,
        tags: 'hyperpop',
        sunoUrl: 'https://suno.com/song/1',
      },
      'https://fallback.local',
    )

    expect(payload.title).toBe('Noty - Track')
    expect(payload.text).toContain('@noty2686')
    expect(payload.url).toBe('https://suno.com/song/1')
  })

  it('fallback sur url fournie si sunoUrl vide', () => {
    const payload = buildSharePayload(
      {
        id: '1',
        title: 'Track',
        artist: 'Noty',
        handle: 'noty2686',
        audioUrl: 'https://cdn/a.m4a',
        coverUrl: '',
        duration: 10,
        tags: '',
        sunoUrl: '',
      },
      'https://fallback.local',
    )
    expect(payload.url).toBe('https://fallback.local')
  })
})
