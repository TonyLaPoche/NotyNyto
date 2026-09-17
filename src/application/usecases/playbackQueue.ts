import type { Track, TrackAvailabilityFilter } from '../../domain/entities/track'

export function filterTracksByAvailability(
  tracks: Track[],
  cachedIds: string[],
  filter: TrackAvailabilityFilter,
): Track[] {
  if (filter === 'local') return tracks.filter((track) => cachedIds.includes(track.id))
  if (filter === 'online') return tracks.filter((track) => !cachedIds.includes(track.id))
  return tracks
}

export function shuffleTracks<T>(items: T[], random: () => number = Math.random): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

export function pickNextShuffledIndex(
  length: number,
  currentIndex: number,
  random: () => number = Math.random,
): number {
  if (length <= 1) return 0
  let next = currentIndex
  while (next === currentIndex) {
    next = Math.floor(random() * length)
  }
  return next
}

export function estimateDownloadMegabytes(trackCount: number, mbPerTrack: number): number {
  return Math.max(0, Math.round(trackCount * mbPerTrack))
}
