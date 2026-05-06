import { describe, expect, it } from 'vitest'
import { FEATURED_TRACK } from './track'

describe('FEATURED_TRACK', () => {
  it('expose un morceau initial coherent', () => {
    expect(FEATURED_TRACK.id).toBe('noty-grand-frere-faux')
    expect(FEATURED_TRACK.title).toBe('Grand Frere Faux')
    expect(FEATURED_TRACK.artist).toBe('Noty')
    expect(FEATURED_TRACK.genre).toContain('HyperPop')
    expect(FEATURED_TRACK.audioUrl).toBe('/tracks/Grand Frère Faux - Noty.mp3')
  })
})
