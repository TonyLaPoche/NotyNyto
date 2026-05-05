import { describe, expect, it, vi } from 'vitest'
import { FEATURED_TRACK } from '../../domain/entities/track'
import { shareTrack } from './shareTrack'

describe('shareTrack', () => {
  it('utilise navigator.share quand disponible', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    const notify = vi.fn()

    const result = await shareTrack(FEATURED_TRACK, {
      locationHref: 'https://noty-nyto.app',
      share,
      writeText,
      notify,
    })

    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
    expect(writeText).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('bascule sur le fallback clipboard si share indisponible', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const notify = vi.fn()

    const result = await shareTrack(FEATURED_TRACK, {
      locationHref: 'https://noty-nyto.app',
      writeText,
      notify,
    })

    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('Noty - Double Face.exe\nhttps://noty-nyto.app')
    expect(notify).toHaveBeenCalledWith('Lien copie dans le presse-papiers.')
  })
})
