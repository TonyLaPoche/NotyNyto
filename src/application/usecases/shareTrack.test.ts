import { describe, expect, it, vi } from 'vitest'
import { shareTrack } from './shareTrack'

const track = {
  id: '1',
  title: 'Track',
  artist: 'Noty',
  handle: 'noty2686',
  audioUrl: 'https://cdn/a.m4a',
  coverUrl: '',
  duration: 10,
  tags: 'hyperpop',
  sunoUrl: 'https://suno.com/song/1',
}

describe('shareTrack', () => {
  it('utilise navigator.share quand disponible', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const result = await shareTrack(track, {
      locationHref: 'https://app.local',
      share,
      writeText: vi.fn(),
      notify: vi.fn(),
    })
    expect(result).toBe('shared')
    expect(share).toHaveBeenCalled()
  })

  it('copie dans le presse-papiers sinon', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const notify = vi.fn()
    const result = await shareTrack(track, {
      locationHref: 'https://app.local',
      writeText,
      notify,
    })
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalled()
    expect(notify).toHaveBeenCalled()
  })
})
