import { describe, expect, it } from 'vitest'
import {
  estimateDownloadMegabytes,
  filterTracksByAvailability,
  pickNextShuffledIndex,
  shuffleTracks,
} from './playbackQueue'
import type { Track } from '../../domain/entities/track'

const tracks: Track[] = [
  {
    id: 'a',
    title: 'A',
    artist: 'X',
    handle: 'x',
    audioUrl: 'u',
    coverUrl: '',
    duration: 1,
    tags: '',
    sunoUrl: 's',
  },
  {
    id: 'b',
    title: 'B',
    artist: 'X',
    handle: 'x',
    audioUrl: 'u',
    coverUrl: '',
    duration: 1,
    tags: '',
    sunoUrl: 's',
  },
  {
    id: 'c',
    title: 'C',
    artist: 'X',
    handle: 'x',
    audioUrl: 'u',
    coverUrl: '',
    duration: 1,
    tags: '',
    sunoUrl: 's',
  },
]

describe('playbackQueue', () => {
  it('filtre local et online', () => {
    expect(filterTracksByAvailability(tracks, ['a', 'c'], 'local').map((t) => t.id)).toEqual(['a', 'c'])
    expect(filterTracksByAvailability(tracks, ['a'], 'online').map((t) => t.id)).toEqual(['b', 'c'])
    expect(filterTracksByAvailability(tracks, ['a'], 'all')).toHaveLength(3)
  })

  it('melange de facon deterministe avec un random fixe', () => {
    let step = 0
    const values = [0.9, 0.1, 0.5]
    const shuffled = shuffleTracks(tracks, () => values[step++] ?? 0)
    expect(shuffled).toHaveLength(3)
    expect(new Set(shuffled.map((t) => t.id))).toEqual(new Set(['a', 'b', 'c']))
  })

  it('choisit un index different en shuffle', () => {
    expect(pickNextShuffledIndex(1, 0)).toBe(0)
    expect(pickNextShuffledIndex(3, 1, () => 0)).toBe(0)
  })

  it('estime le poids de telechargement', () => {
    expect(estimateDownloadMegabytes(12, 8)).toBe(96)
  })
})
