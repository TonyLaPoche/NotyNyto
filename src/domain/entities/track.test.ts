import { describe, expect, it } from 'vitest'
import { DEMO_ARTIST_HANDLE, type Track } from './track'

describe('track entities', () => {
  it('expose le handle demo Noty', () => {
    expect(DEMO_ARTIST_HANDLE).toBe('noty2686')
  })

  it('accepte une shape Track complete', () => {
    const track: Track = {
      id: 'abc',
      title: 'Demo',
      artist: 'Noty',
      handle: 'noty2686',
      audioUrl: 'https://example.com/a.m4a',
      coverUrl: 'https://example.com/a.jpg',
      duration: 120,
      tags: 'hyperpop',
      lyrics: 'hello',
      sunoUrl: 'https://suno.com/song/abc',
    }
    expect(track.handle).toBe('noty2686')
  })
})
