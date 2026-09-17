import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cacheTrackAudio,
  clearCachedAudio,
  getCachedAudioByteLength,
  getCachedTrackAudio,
  listCachedTrackIds,
  removeCachedTrackAudio,
  resolvePlayableUrl,
} from './offlineAudioCache'

describe('offlineAudioCache', () => {
  beforeEach(async () => {
    await clearCachedAudio()
  })

  it('telecharge, liste, resout et nettoie un audio', async () => {
    const blob = new Blob(['abc'], { type: 'audio/mp4' })
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })

    const record = await cacheTrackAudio('track-1', 'https://cdn/a.m4a', fetcher as unknown as typeof fetch)
    expect(record.trackId).toBe('track-1')
    expect(record.byteLength).toBe(3)

    expect(await listCachedTrackIds()).toEqual(['track-1'])
    expect(await getCachedAudioByteLength()).toBe(3)
    expect((await getCachedTrackAudio('track-1'))?.trackId).toBe('track-1')

    const playable = await resolvePlayableUrl('track-1', 'https://cdn/a.m4a')
    expect(playable.startsWith('blob:')).toBe(true)

    const remote = await resolvePlayableUrl('missing', 'https://cdn/remote.m4a')
    expect(remote).toBe('https://cdn/remote.m4a')

    await removeCachedTrackAudio('track-1')
    expect(await listCachedTrackIds()).toEqual([])
  })

  it('echoue si le fetch audio est en erreur', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false })
    await expect(cacheTrackAudio('x', 'https://cdn/a.m4a', fetcher as unknown as typeof fetch)).rejects.toThrow(
      'Telechargement audio impossible',
    )
  })

  it('utilise audio/mp4 par defaut si le blob n a pas de type', async () => {
    const blob = new Blob(['xyz'])
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })
    const record = await cacheTrackAudio('no-type', 'https://cdn/a.m4a', fetcher as unknown as typeof fetch)
    expect(record.mimeType).toBe('audio/mp4')
  })
})
