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
      headers: { get: () => null },
      blob: async () => blob,
    })

    const record = await cacheTrackAudio('track-1', 'https://cdn1.suno.ai/track-1.mp4', fetcher as unknown as typeof fetch)
    expect(record.trackId).toBe('track-1')
    expect(record.byteLength).toBe(3)

    expect(await listCachedTrackIds()).toEqual(['track-1'])
    expect(await getCachedAudioByteLength()).toBe(3)
    expect((await getCachedTrackAudio('track-1'))?.trackId).toBe('track-1')

    const playable = await resolvePlayableUrl('track-1', 'https://cdn1.suno.ai/track-1.mp4')
    expect(playable.startsWith('blob:')).toBe(true)

    const remote = await resolvePlayableUrl(
      'missing',
      'https://d2lwuy8qc234o3.cloudfront.net/1/clip/missing.m4a',
    )
    expect(remote).toBe('https://cdn1.suno.ai/missing.mp4')

    await removeCachedTrackAudio('track-1')
    expect(await listCachedTrackIds()).toEqual([])
  })

  it('echoue si le fetch audio est en erreur', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, headers: { get: () => null } })
    await expect(cacheTrackAudio('x', 'https://cdn1.suno.ai/x.mp4', fetcher as unknown as typeof fetch)).rejects.toThrow(
      'Telechargement audio impossible',
    )
  })

  it('utilise audio/mp4 par defaut si le blob n a pas de type', async () => {
    const blob = new Blob(['xyz'])
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      blob: async () => blob,
    })
    const record = await cacheTrackAudio('no-type', 'https://cdn1.suno.ai/no-type.mp4', fetcher as unknown as typeof fetch)
    expect(record.mimeType).toBe('audio/mp4')
  })

  it('signale la progression pendant le telechargement', async () => {
    const chunk = new Uint8Array([1, 2, 3, 4])
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (key: string) => (key === 'content-length' ? '4' : key === 'content-type' ? 'audio/mp4' : null),
      },
      body: {
        getReader: () => {
          let done = false
          return {
            read: async () => {
              if (done) return { done: true, value: undefined }
              done = true
              return { done: false, value: chunk }
            },
          }
        },
      },
    })
    const onProgress = vi.fn()
    const record = await cacheTrackAudio(
      'progressive',
      'https://cdn1.suno.ai/p.mp4',
      fetcher as unknown as typeof fetch,
      onProgress,
    )
    expect(record.byteLength).toBe(4)
    expect(onProgress).toHaveBeenCalled()
    expect(onProgress).toHaveBeenCalledWith(100)
  })
})
