import { describe, expect, it } from 'vitest'
import { FEATURED_TRACK } from './track'

describe('FEATURED_TRACK', () => {
  it('expose un morceau initial coherent', () => {
    expect(FEATURED_TRACK.id).toBe('noty-double-face-exe')
    expect(FEATURED_TRACK.title).toBe('Double Face.exe')
    expect(FEATURED_TRACK.artist).toBe('Noty')
    expect(FEATURED_TRACK.genre).toContain('HyperPop')
    expect(FEATURED_TRACK.audioUrl).toBe('/tracks/double-face.exe-noty-v2.mp3')
  })
})
